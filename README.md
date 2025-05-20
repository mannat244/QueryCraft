# QueryCraft

**QueryCraft** is an AI-powered query assistant built as a Next.js web application. It allows users to input **natural language questions** and automatically translates them into executable **SQL queries** for a MySQL database. QueryCraft then runs the query against the specified database, displays the results in a table if applicable, and provides a concise textual response.

## Features

* **Natural Language Interface**: Converts plain English questions into SQL queries.
* **AI Backend**: Utilizes Azure OpenAI to generate SQL based on user queries and the current database schema.
* **Schema-Aware Querying**: Dynamically retrieves schema (tables, columns, and relations) to ensure SQL accuracy.
* **Dynamic SQL Execution**: Executes queries and retrieves live results from the user’s MySQL database.
* **Responsive UI**: Chat interface displays both assistant responses and results in a tabular format.
* **Session-Based Database Setup**: Uses encrypted sessions to securely store and reuse user-provided DB credentials.

## Technology Stack

* **Frontend**: Next.js (React), Tailwind CSS
* **Backend**: Next.js API routes, Azure OpenAI, MySQL (via `mysql2/promise`)
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
ENDPOINT=<azure-openai-endpoint>
APIKEY=<azure-api-key>
MODELNAME=<model-name>
DEPLOYMENT=<deployment-name>
APIVERSION=2023-05-15
SESSION_PASSWORD=<your-secure-password>
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
4. Receive an AI-generated explanation, underlying SQL query, and tabular results.
5. ![image](https://github.com/user-attachments/assets/8dd112f3-18e4-4a7d-b1de-d960baa86aa8)
6. ![image](https://github.com/user-attachments/assets/cf1179fb-ed90-46ff-abbc-2d35fa015459)
7. ![image](https://github.com/user-attachments/assets/98278070-11bb-4b29-922f-0d2fd4aaf3c6)





## API Endpoints

### POST `/api/db`

Stores the DB configuration in the session.
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

### POST `/api/ask`

Handles user questions, generates SQL, runs it, and returns output.
**Body:**

```json
{
  "query": "List all orders from 2023"
}
```

**Response:**

```json
{
  "output": [...],
  "text": "Here are the orders from 2023.",
  "table": true
}
```

## Architecture Overview

1. **Frontend UI**:

   * React + Tailwind chat interface
   * Displays user messages, assistant replies, and tables

2. **API Layer**:

   * `/api/db` saves DB config
   * `/api/ask` fetches schema, prompts Azure OpenAI, executes SQL, returns result

3. **AI Integration**:

   * Azure OpenAI receives full schema + user question
   * Returns structured JSON: `{ "text", "sql", "table" }`

4. **MySQL Execution**:

   * SQL executed using `mysql2/promise`
   * Results returned to frontend for rendering

## Contribution

Contributions welcome via pull requests or issues on GitHub.
Please follow standard code style and include tests if applicable.

## License

No license is specified. Assume all rights reserved unless stated otherwise.

## Contact

**Maintainer**: [mannat244](https://github.com/mannat244)
