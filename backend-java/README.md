# Backend Java - Dashboard Wazuh

Backend em Java com Spring Boot para consultar alertas do Wazuh Indexer e entregar dados tratados ao frontend Angular.

## Tecnologias

- Java 17+
- Spring Boot
- Maven
- Wazuh Indexer API

## Configuração

Edite o arquivo:

```text
src/main/resources/application.properties
```

Configuração atual:

```properties
server.port=8081
wazuh.indexer-url=https://localhost:9200
wazuh.username=admin
wazuh.password=SUA_SENHA
wazuh.alert-index=wazuh-alerts*
wazuh.ignore-ssl=true
app.cors.allowed-origins=http://localhost:4200
```

Se o backend estiver na mesma máquina do Wazuh, use:

```properties
wazuh.indexer-url=https://localhost:9200
```

Se o backend estiver em outro computador acessando o Wazuh pelo ZeroTier, use o IP ZeroTier do servidor:

```properties
wazuh.indexer-url=https://IP-ZEROTIER:9200
```

## Rodar

```bash
mvn spring-boot:run
```

## Gerar jar

```bash
mvn clean package
java -jar target/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

## Rotas

```http
GET http://localhost:8081/api/health
GET http://localhost:8081/api/wazuh/status
GET http://localhost:8081/api/alerts?lastHours=24&minLevel=7&size=20
GET http://localhost:8081/api/alerts/severity?lastHours=24
GET http://localhost:8081/api/alerts/top-rules?lastHours=24
GET http://localhost:8081/api/alerts/agents?lastHours=24
GET http://localhost:8081/api/alerts/source-ips?lastHours=24
```

## Observações

O frontend não acessa o Wazuh Indexer diretamente. As credenciais ficam no backend e o Angular consome apenas as rotas `/api`.
