# QueryCraft

**QueryCraft** is an AI-powered query assistant built as a Next.js web application. It allows users to input **natural language questions** and automatically translates them into executable **SQL queries** for a MySQL database. QueryCraft then runs the query against the specified database, displays the results in a table if applicable, and provides a concise textual response.

>Now powered by Google Gemini API with Pinecone vector embeddings!
>QueryCraft uses Google Gemini for natural language processing and Microsoft E5-Large embeddings via Pinecone for intelligent schema retrieval, delivering enhanced accuracy on complex queries.

## Features

* **Natural Language Interface**: Converts plain English questions into SQL queries.
* **AI Backend**: Utilizes Google Gemini API to generate SQL based on user queries and the current database schema.
* **Schema-Aware Querying**: Dynamically retrieves schema (tables, columns, and relations) to ensure SQL accuracy with intelligent schema handling based on size.
* **Dynamic SQL Execution**: Executes queries and retrieves live results from the user's MySQL database.
* **Transparent SQL Display**: Shows the generated SQL query alongside results for full transparency.
* **Think Mode**: Advanced post-query analysis mode for deeper insights and query optimization.
* **Responsive UI**: Chat interface displays both assistant responses and results in a tabular format.
* **Session-Based Database Setup**: Uses encrypted sessions to securely store and reuse user-provided DB credentials.

## Technology Stack

* **Frontend**: Next.js (React), Tailwind CSS
* **Backend**: Next.js API routes, Google Gemini API, MySQL (via `mysql2/promise`)
* **Vector Database**: Pinecone with Microsoft E5-Large embeddings for schema retrieval
* **Session Management**: `iron-session` for secure session handling

## Installation

1. **Clone the Repository**

```bash
git clone https://github.com/mannat244/QueryCraft.git
cd QueryCraft
```

2. **Install Dependencies**

```bash
npm install
```

3. **Environment Configuration**
   Create a `.env.local` file with the following:

```env
# Session Management
SESSION_PASSWORD=<your-secure-password>

# Google Gemini API (Primary AI)
GEMINI_API_KEY=<your-gemini-api-key>

# Pinecone Vector Database
PINECONE_APIKEY=<your-pinecone-api-key>
INDEX_NAME=schemaindex

# Database SSL Certificate (if required)
DB_SSL_CA="-----BEGIN CERTIFICATE-----
<your-ssl-certificate-content>
-----END CERTIFICATE-----"

# Azure OpenAI (currently not in use, kept for future compatibility)
ENDPOINT=https://23112--eastus2..azure./
MODELNAME=o3-mini
DEPLOYMENT=o3-mini
APIKEY=<azure-api-key>
APIVERSION=2024-12--preview
```

4. **Start the Development Server**

```bash
npm run dev
```

App runs at: [http://localhost:3000](http://localhost:3000)

## Usage

1. Navigate to the app in your browser.
2. Input database credentials (host, user, password, database, port) to establish connection.
3. Ask natural language questions like:

   > "Show me all employees in the Sales department."
4. Receive an AI-generated explanation, the actual SQL query used, and tabular results.
5. Use **Think Mode** by setting `think: true` in your request for advanced post-query analysis and insights.
6. ![image](https://github.com/user-attachments/assets/7caa52df-e314-44bd-a036-9b74210a78c4)

7. ![image](https://github.com/user-attachments/assets/a28bf408-5959-4bd0-ba98-81f9d565dbeb)

8. ![image](https://github.com/user-attachments/assets/7d36ea33-744c-4ca0-90ba-ee3d9c44043b)



## API Endpoints

### POST `/api/ask` — Query Processing
Accepts JSON payload with natural language query and processes it using AI.

**Features:**
* Uses session DB config (MySQL or MongoDB)
* For MySQL, establishes connection with optional SSL
* Intelligent schema handling: fetches complete schema if under 8K tokens, otherwise relies on Pinecone vector DB for relevant schema retrieval
* Calls AI to convert query to SQL with schema awareness
* Executes SQL and returns results with explanations
* **Think Mode**: Optional boolean parameter (`think: true`) enhances the response text with deeper analysis and optimization insights
* Displays generated SQL query for full transparency
* MongoDB support not yet available (returns friendly message)

**Body:**
```json
{
  "query": "List all orders from 2023",
  "think": true
}
```

**Response:**
```json
{
  "output": [...],
  "text": "Here are the orders from 2023. This query efficiently filters orders by year using the YEAR() function...",
  "sql": "SELECT * FROM orders WHERE YEAR(order_date) = 2023",
  "table": true
}
```

### POST `/api/db` — Set Database Configuration
Stores database configuration in user session.

**Features:**
* Accepts JSON for DB config or MongoDB connection string
* Stores config in user session
* Supports switching between MySQL and MongoDB

**Body:**
```json
{
  "host": "db.example.com",
  "user": "username",
  "password": "password",
  "database": "mydb",
  "port": 3306
}
```

### POST `/api/schema` — Schema Embedding and Indexing
Handles schema extraction and vector indexing for improved query accuracy.

**Features:**
* Connects to MySQL using session DB config
* Extracts comprehensive schema info (tables, columns, relations)
* Intelligent schema processing: 
  - **Small schemas (≤8K tokens)**: Complete schema sent directly with queries for optimal accuracy
  - **Large schemas (>8K tokens)**: Schema embedded using Microsoft E5-Large model and indexed in Pinecone vector DB for semantic retrieval
* Indexes vectors under session database namespace for isolation

### POST `/api/logout` — Logout User
Destroys the current user session and clears stored database configurations.

### GET `/api/session` — Check Session
Returns current session status and database configuration.

**Response:**
```json
{
  "dbConfig": {...},
  "connectionStatus": "connected"
}
```

## Workflow

The typical workflow follows this sequence:
1. **`/db`** → Set database configuration
2. **`/schema`** → Extract and index schema information
3. **`/ask`** → Process natural language queries

Both `/session` and `/logout` endpoints help maintain session persistence throughout the user experience.

## Architecture Overview

1. **Frontend UI**:

   * React + Tailwind chat interface
   * Displays user messages, assistant replies, and tables

2. **API Layer**:

   * `/api/db` saves DB config
   * `/api/schema` extracts schema and creates embeddings using Microsoft E5-Large
   * `/api/ask` processes queries using Gemini API with intelligent schema retrieval

3. **AI Integration**:

   * Google Gemini API receives user question with contextually relevant schema information
   * For small schemas (≤8K chars): Complete schema included with query
   * For large schemas (>8K chars): Pinecone vector search with Microsoft E5-Large embeddings retrieves most relevant schema portions
   * Returns structured JSON with text explanation (enhanced with analysis when think mode is enabled), SQL query, and results: `{ "text", "sql", "table" }`

4. **MySQL Execution**:

   * SQL executed using `mysql2/promise`
   * Results returned to frontend for rendering
## Future Scope

QueryCraft is evolving quickly to meet developer and analyst needs. Upcoming improvements include:

1. **Session History & Follow-Up Questions**  
   Enable persistent session history to support context-aware follow-up queries and maintain conversational continuity. This will allow users to build on previous questions naturally, similar to how they interact in a typical chat with an assistant.

2. **Open Source LLM Integration**  
   Replace or complement the Google Gemini API with open-source LLMs (like LLaMA, Mistral, or Mixtral) to provide greater control, customization, and reduce dependency on third-party APIs. This can also enhance offline deployment options.

3. **Open Source Vector Database**  
   Integrate with open-source alternatives to Pinecone (such as **Weaviate**, **Qdrant**, or **FAISS**) to lower costs and increase flexibility in embedding storage and search strategies.

4. **Improved Error Handling and Robustness**  
   Enhance backend resilience by implementing:
   - Detailed error reporting for failed SQL executions
   - Schema parsing failures
   - Network issues
   - Graceful fallbacks for AI output failures  
   This ensures a more reliable and user-friendly experience across various edge cases and deployment environments.

## Contribution

Contributions welcome via pull requests or issues on GitHub.
Please follow standard code style and include tests if applicable.

## License

No license is specified. Assume all rights reserved unless stated otherwise.

## Contact

**Maintainer**: [mannat244](https://github.com/mannat244)
