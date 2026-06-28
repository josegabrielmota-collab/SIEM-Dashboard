# SIEM Dashboard - Dashboard de Monitoramento de Tentativas de Invasão

Este projeto consiste em um dashboard lightweight para visualização de alertas de segurança gerados pelo Wazuh. Utilizamos o Wazuh como motor de coleta, correlação e indexação dos eventos e usamos esta aplicação, composta por backend em Java/Spring Boot e frontend em Angular, para realizar a consulta, tratamento e apresentação dos dados em uma interface mais simples e objetiva.

## Tecnologias utilizadas

* Wazuh
* Wazuh Indexer
* Java 17
* Spring Boot
* Angular
* Node.js
* npm
* TypeScript
* SCSS
* Maven, opcionalmente, apenas para recompilar o backend

## Estrutura do projeto

```text
SIEM-Dashboard/
├── backend-java/
│   ├── src/
│   ├── pom.xml
│   └── target/
│
├── frontend-angular/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   └── angular.json
│
├── .gitignore
└── README.md
```

## Pré-requisitos

Antes de executar o projeto, é necessário ter um ambiente Wazuh funcionando e instalar as dependências do backend e do frontend.

### Wazuh

O Wazuh Manager e o Wazuh Indexer devem estar instalados em um ambiente Linux. No ambiente de testes do projeto, o Wazuh foi executado em uma máquina Linux Ubuntu.

O ambiente Wazuh deve conter:

* Wazuh Manager
* Wazuh Indexer
* Wazuh Dashboard
* Agentes Wazuh cadastrados e ativos

O backend consulta os alertas diretamente no Wazuh Indexer, normalmente disponível na porta:

```text
https://localhost:9200
```

### Backend

Para executar o backend pelo arquivo `.jar`, é necessário apenas:

* Java 17 ou superior
* Maven

Para verificar se o Java está instalado:

```bash
java -version
```

Para instalar o java no linux:

```bash
sudo apt update
sudo apt install openjdk-17-jdk -y
```

Para verificar se o maven está instalado:

```bash
mvn -version
```

Para instalar o maven no linux:

```bash
sudo apt update
sudo apt install maven -y
```

### Frontend

Para executar o frontend, é necessário ter:

* Node.js
* npm

Para verificar se estão instalados:

```bash
node -v
npm -v
```

Para instalar no linux:

```bash
sudo apt update
sudo apt install nodejs npm -y
```

## Configuração do backend

O arquivo principal de configuração fica em:

```text
backend-java/src/main/resources/application.properties
```

Exemplo recomendado:

```properties
server.port=${PORT:8081}

wazuh.indexer-url=${WAZUH_INDEXER_URL:https://localhost:9200}
wazuh.username=${WAZUH_USERNAME:admin}
wazuh.password=${WAZUH_PASSWORD:senha}
wazuh.alert-index=${WAZUH_ALERT_INDEX:wazuh-alerts*}
wazuh.ignore-ssl=${WAZUH_IGNORE_SSL:true}

app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:4200}
```

Por questões de segurança, a senha do Wazuh não deve ficar salva diretamente no código. Use variáveis de ambiente.

## Configurando variáveis de ambiente no Linux

Antes de iniciar o backend, configure as variáveis no terminal.

Se o backend estiver rodando na mesma máquina do Wazuh:

```bash
export WAZUH_INDEXER_URL="https://localhost:9200"
export WAZUH_USERNAME="admin"
export WAZUH_PASSWORD="SUA_SENHA_DO_WAZUH"
export WAZUH_ALERT_INDEX="wazuh-alerts*"
export WAZUH_IGNORE_SSL="true"
export CORS_ALLOWED_ORIGINS="http://localhost:4200"
```

## Executando o backend pelo arquivo `.jar`

Caso o `.jar` esteja dentro da pasta `backend-java/target/`, execute:

```bash
java -jar backend-java/target/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

Se você já estiver dentro da pasta `backend-java`, execute:

```bash
java -jar target/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

Se o `.jar` estiver em outra pasta, informe o caminho correto:

```bash
java -jar /caminho/para/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

Por padrão, o backend será iniciado em:

```text
http://localhost:8081
```

## Testando o backend

Com o backend em execução, teste a rota de saúde, acesse:

```bash
http://localhost:8081/api/health
```

Teste a conexão com o Wazuh Indexer:

```bash
http://localhost:8081/api/wazuh/status
```

Teste a busca de alertas:

```bash
"http://localhost:8081/api/alerts?lastHours=24&minLevel=0&size=50"
```

Caso não apareçam alertas recentes, aumente o período de busca:

```bash
"http://localhost:8081/api/alerts?lastHours=168&minLevel=0&size=50"
```

## Executando o frontend

Acesse a pasta do frontend:

```bash
cd frontend-angular
```

Instale as dependências:

```bash
npm install
```

Execute o projeto:

```bash
npm start
```

O frontend será iniciado em:

```text
http://localhost:4200
```

## Configuração da URL do backend no frontend

O frontend consome a API do backend. A URL fica configurada no arquivo:

```text
frontend-angular/src/app/services/wazuh-api.ts
```

Se o backend estiver rodando na mesma máquina do frontend:

```typescript
private readonly apiUrl = 'http://localhost:8081/api';
```

## Login do protótipo

O projeto possui uma tela de login simples.

Credenciais padrão:

```text
Usuário: admin
Senha: admin123
```

## Fluxo de funcionamento

```text
Endpoint monitorado
↓
Agente Wazuh
↓
Wazuh Manager
↓
Wazuh Indexer
↓
Backend Java / Spring Boot
↓
API REST customizada
↓
Frontend Angular
↓
Dashboard SIEM Lightweight
```

## Build do frontend

Para gerar a versão de produção do frontend:

```bash
cd frontend-angular
npm run build
```

Os arquivos gerados ficam na pasta:

```text
frontend-angular/dist/
```

## Build do backend com Maven

Execute esse comando para gerar o jar:

```bash
cd backend-java
mvn clean package
```

O `.jar` será gerado em:

```text
backend-java/target/
```

Para executar o `.jar` gerado:

```bash
java -jar target/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

## Resumo de execução rápida

Terminal 1 - Backend:

```bash
export WAZUH_INDEXER_URL="https://localhost:9200"
export WAZUH_USERNAME="admin"
export WAZUH_PASSWORD="SUA_SENHA_DO_WAZUH"
export WAZUH_ALERT_INDEX="wazuh-alerts*"
export WAZUH_IGNORE_SSL="true"
export CORS_ALLOWED_ORIGINS="http://localhost:4200"

mvn clean package

java -jar backend-java/target/wazuh-dashboard-backend-0.0.1-SNAPSHOT.jar
```

Terminal 2 - Frontend:

```bash
cd frontend-angular
npm install
npm start
```

Acesse:

```text
http://localhost:4200
```
