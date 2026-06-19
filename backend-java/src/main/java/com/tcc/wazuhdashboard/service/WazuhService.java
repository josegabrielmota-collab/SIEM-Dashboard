package com.tcc.wazuhdashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tcc.wazuhdashboard.config.WazuhProperties;
import com.tcc.wazuhdashboard.dto.AlertDto;
import com.tcc.wazuhdashboard.dto.AlertListResponse;
import com.tcc.wazuhdashboard.dto.CountDto;
import com.tcc.wazuhdashboard.dto.CountListResponse;
import com.tcc.wazuhdashboard.exception.WazuhApiException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Service
public class WazuhService {

    private final RestTemplate restTemplate;
    private final WazuhProperties properties;
    private final ObjectMapper objectMapper;

    public WazuhService(RestTemplate wazuhRestTemplate, WazuhProperties properties, ObjectMapper objectMapper) {
        this.restTemplate = wazuhRestTemplate;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public JsonNode getIndexerStatus() {
        return request(HttpMethod.GET, "/", null);
    }

    public AlertListResponse getRecentAlerts(int lastHours, int minLevel, int size) {
        ObjectNode query = objectMapper.createObjectNode();
        query.put("size", size);

        ArrayNode sort = query.putArray("sort");
        ObjectNode timestampSort = objectMapper.createObjectNode();
        ObjectNode timestampSortOptions = objectMapper.createObjectNode();
        timestampSortOptions.put("order", "desc");
        timestampSort.set("@timestamp", timestampSortOptions);
        sort.add(timestampSort);

        ArrayNode source = query.putArray("_source");
        List.of(
                "@timestamp",
                "rule.level",
                "rule.description",
                "rule.groups",
                "agent.name",
                "agent.ip",
                "manager.name",
                "location",
                "data.srcip",
                "data.dstip",
                "srcip",
                "dstip",
                "source.ip",
                "source.address",
                "destination.ip",
                "mitre.tactic",
                "mitre.technique",
                "full_log"
        ).forEach(source::add);

        ObjectNode rootQuery = query.putObject("query");
        ObjectNode bool = rootQuery.putObject("bool");
        ArrayNode filters = bool.putArray("filter");
        filters.add(timeRange(lastHours));
        filters.add(levelRange(minLevel));

        JsonNode response = request(HttpMethod.POST, "/" + properties.getAlertIndex() + "/_search", query);

        long total = readTotal(response);
        List<AlertDto> alerts = new ArrayList<>();

        JsonNode hits = response.at("/hits/hits");
        if (hits.isArray()) {
            for (JsonNode hit : hits) {
                JsonNode src = hit.path("_source");
                alerts.add(toAlertDto(hit.path("_id").asText(null), src));
            }
        }

        return new AlertListResponse(true, total, alerts);
    }

    public CountListResponse getAlertsBySeverity(int lastHours) {
        return termsAggregation("rule.level", "por_severidade", lastHours, 20);
    }

    public CountListResponse getTopRules(int lastHours) {
        return termsAggregation("rule.description.keyword", "top_regras", lastHours, 10);
    }

    public CountListResponse getAlertsByAgent(int lastHours) {
        return termsAggregation("agent.name.keyword", "por_agente", lastHours, 10);
    }

    public CountListResponse getTopSourceIps(int lastHours) {
        return sourceIpAggregation(lastHours);
    }

    private CountListResponse termsAggregation(String field, String aggregationName, int lastHours, int size) {
        ObjectNode query = objectMapper.createObjectNode();
        query.put("size", 0);

        ObjectNode rootQuery = query.putObject("query");
        ObjectNode bool = rootQuery.putObject("bool");
        ArrayNode filters = bool.putArray("filter");
        filters.add(timeRange(lastHours));

        ObjectNode aggs = query.putObject("aggs");
        ObjectNode aggregation = aggs.putObject(aggregationName);
        ObjectNode terms = aggregation.putObject("terms");
        terms.put("field", field);
        terms.put("size", size);
        terms.put("missing", "Não informado");

        JsonNode response = request(HttpMethod.POST, "/" + properties.getAlertIndex() + "/_search", query);
        return countListFromBuckets(response, aggregationName);
    }

    private CountListResponse sourceIpAggregation(int lastHours) {
        ObjectNode query = objectMapper.createObjectNode();
        query.put("size", 0);

        ObjectNode rootQuery = query.putObject("query");
        ObjectNode bool = rootQuery.putObject("bool");
        ArrayNode filters = bool.putArray("filter");
        filters.add(timeRange(lastHours));

        ObjectNode aggs = query.putObject("aggs");
        ObjectNode aggregation = aggs.putObject("top_ips_origem");
        ObjectNode terms = aggregation.putObject("terms");
        terms.put("size", 10);
        terms.putObject("script").put("source", sourceIpScript());

        JsonNode response = request(HttpMethod.POST, "/" + properties.getAlertIndex() + "/_search", query);
        return countListFromBuckets(response, "top_ips_origem");
    }

    private CountListResponse countListFromBuckets(JsonNode response, String aggregationName) {
        JsonNode buckets = response.at("/aggregations/" + aggregationName + "/buckets");
        List<CountDto> data = new ArrayList<>();

        if (buckets.isArray()) {
            for (JsonNode bucket : buckets) {
                String label = bucket.path("key_as_string").asText(bucket.path("key").asText("Não informado"));
                if (!label.isBlank() && !"null".equalsIgnoreCase(label)) {
                    data.add(new CountDto(label, bucket.path("doc_count").asLong(0)));
                }
            }
        }

        return new CountListResponse(true, data);
    }

    private ObjectNode timeRange(int lastHours) {
        ObjectNode timestampRange = objectMapper.createObjectNode();
        ObjectNode timestampRangeBody = objectMapper.createObjectNode();
        ObjectNode timestampOptions = objectMapper.createObjectNode();
        timestampOptions.put("gte", "now-" + lastHours + "h");
        timestampRangeBody.set("@timestamp", timestampOptions);
        timestampRange.set("range", timestampRangeBody);
        return timestampRange;
    }

    private ObjectNode levelRange(int minLevel) {
        ObjectNode levelRange = objectMapper.createObjectNode();
        ObjectNode levelRangeBody = objectMapper.createObjectNode();
        ObjectNode levelOptions = objectMapper.createObjectNode();
        levelOptions.put("gte", minLevel);
        levelRangeBody.set("rule.level", levelOptions);
        levelRange.set("range", levelRangeBody);
        return levelRange;
    }

    private String sourceIpScript() {
        return "if (doc.containsKey('data.srcip') && doc['data.srcip'].size() != 0) return doc['data.srcip'].value.toString(); " +
                "if (doc.containsKey('srcip') && doc['srcip'].size() != 0) return doc['srcip'].value.toString(); " +
                "if (doc.containsKey('source.ip') && doc['source.ip'].size() != 0) return doc['source.ip'].value.toString(); " +
                "return 'Não informado';";
    }

    private AlertDto toAlertDto(String id, JsonNode src) {
        return new AlertDto(
                id,
                text(src, "/@timestamp"),
                integer(src, "/rule/level"),
                text(src, "/rule/description"),
                stringList(src, "/rule/groups"),
                text(src, "/agent/name"),
                text(src, "/agent/ip"),
                text(src, "/manager/name"),
                text(src, "/location"),
                firstText(src, "/data/srcip", "/srcip", "/source/ip", "/source/address"),
                firstText(src, "/data/dstip", "/dstip", "/destination/ip"),
                stringList(src, "/mitre/tactic"),
                stringList(src, "/mitre/technique"),
                text(src, "/full_log")
        );
    }

    private JsonNode request(HttpMethod method, String path, JsonNode body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(properties.getUsername(), properties.getPassword());
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<JsonNode> entity = new HttpEntity<>(body, headers);
            URI uri = URI.create(properties.getIndexerUrl() + path);

            ResponseEntity<JsonNode> response = restTemplate.exchange(uri, method, entity, JsonNode.class);
            return response.getBody();
        } catch (HttpStatusCodeException exception) {
            throw new WazuhApiException(
                    "Erro ao consultar o Wazuh Indexer. Status " + exception.getStatusCode() + ": " + exception.getResponseBodyAsString(),
                    exception
            );
        } catch (Exception exception) {
            throw new WazuhApiException("Erro ao conectar no Wazuh Indexer: " + exception.getMessage(), exception);
        }
    }

    private long readTotal(JsonNode response) {
        JsonNode total = response.at("/hits/total");
        if (total.isObject()) {
            return total.path("value").asLong(0);
        }
        return total.asLong(0);
    }

    private String text(JsonNode node, String pointer) {
        JsonNode value = node.at(pointer);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        return value.asText();
    }

    private String firstText(JsonNode node, String... pointers) {
        for (String pointer : pointers) {
            String value = text(node, pointer);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Integer integer(JsonNode node, String pointer) {
        JsonNode value = node.at(pointer);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        return value.asInt();
    }

    private List<String> stringList(JsonNode node, String pointer) {
        JsonNode value = node.at(pointer);
        List<String> result = new ArrayList<>();

        if (value.isMissingNode() || value.isNull()) {
            return result;
        }

        if (value.isArray()) {
            for (JsonNode item : value) {
                result.add(item.asText());
            }
            return result;
        }

        result.add(value.asText());
        return result;
    }
}
