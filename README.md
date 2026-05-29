# News Feed

A personal news-feed app that polls RSS feeds on a schedule, stores articles in
Cosmos DB, and lets you triage them (interested / not interested) from a clean,
mobile-friendly web UI.

## Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────────┐
│   News RSS Feed  │ ──► │   Azure Functions    │ ──► │        Cosmos DB         │
└──────────────────┘     │  (Python, timer)     │     │   (serverless, SQL API)  │
                         │  - Read RSS feed     │     └──────────────────────────┘
                         │  - Dedup by id       │                  ▲
                         │  - Insert new items  │                  │  read / update
                         └──────────────────────┘                  │
                                                                   │
                                                      ┌──────────────────────────┐
                                                      │  Web App (App Service)   │
                                                      │  Express API + React SPA │
                                                      │  - List articles         │
                                                      │  - Flag interested/not   │
                                                      │  - Filter by feed        │
                                                      └──────────────────────────┘
                                                                   ▲
                                                                   │  use app
                                                      ┌──────────────────────────┐
                                                      │          Users           │
                                                      └──────────────────────────┘
```

## Repository layout

```
news-feed/
├── functions/             Python v2 Azure Functions app (timer ingest)
│   ├── function_app.py
│   ├── rss_ingest.py
│   ├── cosmos_client.py
│   ├── feeds_config.py
│   ├── host.json
│   ├── requirements.txt
│   └── local.settings.json.example
├── web_app/               Express API + React SPA
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── src/               Express server code
│   └── client/            Vite + React frontend
└── exploration/           Reference RSS exploration script (not used at runtime)
```

## Data model

Cosmos DB container `articles` (partition key `/feedCategory`):

| Field           | Type   | Notes                                              |
| --------------- | ------ | -------------------------------------------------- |
| `id`            | string | `sha256(url)` hex digest                           |
| `url`           | string | Article URL                                        |
| `title`         | string |                                                    |
| `description`   | string | First 200 chars of the RSS summary, HTML stripped  |
| `publishDate`   | string | ISO 8601                                           |
| `feedCategory`  | string | Partition key, e.g. `Foundry`, `MS All`            |
| `feedIndex`     | number | Position in the configured feed list               |
| `flag`          | string | `null` \| `"interested"` \| `"not_interested"`     |
| `flagUpdatedAt` | string | ISO 8601, or null                                  |
| `createdAt`     | string | ISO 8601, set on insert                            |

## Configuration

All secrets and connection settings come from environment variables — nothing
is hardcoded.

### Functions app (`functions/local.settings.json` or App Settings)

| Setting                    | Required | Default          | Description                                   |
| -------------------------- | -------- | ---------------- | --------------------------------------------- |
| `AzureWebJobsStorage`      | yes      | —                | Storage account connection string             |
| `FUNCTIONS_WORKER_RUNTIME` | yes      | `python`         | Worker runtime                                |
| `COSMOS_ENDPOINT`          | yes      | —                | Cosmos DB account URL                         |
| `COSMOS_KEY`               | yes      | —                | Cosmos DB primary key                         |
| `COSMOS_DATABASE`          | no       | `newsfeed`       | Database name                                 |
| `COSMOS_CONTAINER`         | no       | `articles`       | Container name                                |
| `RSS_SCHEDULE_CRON`        | no       | `0 0 */10 * * *` | NCRONTAB; every 10 hours by default           |
| `RSS_FEEDS`                | no       | spec defaults    | JSON array; see `local.settings.json.example` |

### Web app (`web_app/.env` or App Settings)

| Setting            | Required | Default       | Description                                         |
| ------------------ | -------- | ------------- | --------------------------------------------------- |
| `PORT`             | no       | `3000`        | HTTP port                                           |
| `COSMOS_ENDPOINT`  | yes      | —             | Cosmos DB account URL                               |
| `COSMOS_KEY`       | yes      | —             | Cosmos DB primary key                               |
| `COSMOS_DATABASE`  | no       | `newsfeed`    | Database name                                       |
| `COSMOS_CONTAINER` | no       | `articles`    | Container name                                      |
| `RSS_FEEDS`        | no       | spec defaults | Mirrors the Functions setting; used by `/api/feeds` |

### Adding a new RSS feed

Set the `RSS_FEEDS` environment variable on **both** the Functions app and the
web app to a JSON array, e.g.:

```json
[
  {"index": 0, "category": "Foundry", "url": "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=azure-ai-foundry-blog"},
  {"index": 1, "category": "MS All",  "url": "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/Community?interaction.style=blog&feeds.replies=false"},
  {"index": 2, "category": "My Blog", "url": "https://example.com/rss"}
]
```

## Local development

### Prerequisites
- Python 3.11+
- Node.js 20+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- A Cosmos DB account (cloud or the [Cosmos emulator](https://learn.microsoft.com/azure/cosmos-db/local-emulator))
- Azurite (or any Azure Storage emulator) for the Functions storage binding

### Functions app

```powershell
cd functions
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item local.settings.json.example local.settings.json
# Edit local.settings.json: set COSMOS_ENDPOINT and COSMOS_KEY
func start
```

Manually trigger the timer once (default function name `IngestRssFeeds`):

Bash:
```bash
curl -X POST http://localhost:7071/admin/functions/IngestRssFeeds -H "Content-Type: application/json" -d "{}"
```

Powershell:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:7071/admin/functions/IngestRssFeeds" -ContentType "application/json" -Body "{}"
```

### Web app

```powershell
cd web_app
Copy-Item .env.example .env
# Edit .env: set COSMOS_ENDPOINT and COSMOS_KEY
npm install            # installs root + client/ (postinstall)
npm run dev            # Express on :3000, Vite dev server on :5173 (with /api proxy)
```

Open <http://localhost:5173>.

For a production-style run:

```powershell
npm run build          # builds client/ into client/dist
npm start              # Express serves the API + static SPA on :3000
```

### REST API

| Method | Path                                | Notes                                                                                            |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/api/feeds`                        | Configured feed list                                                                             |
| GET    | `/api/articles?status=&feed=`       | `status` ∈ `unclassified` (default), `interested`, `not_interested`; `feed` = category or `all`  |
| PATCH  | `/api/articles/:id?feed=<category>` | Body: `{ "flag": "interested" \| "not_interested" \| null }`                                     |
| GET    | `/api/health`                       | Simple health probe                                                                              |

## Deploy to Azure

The commands below use the Azure CLI. Replace the placeholder values at the
top to suit your subscription.

```powershell
$loc       = "eastus"
$rg        = "news-feed-rg"
$cosmosAcc = "newsfeed-cosmos-$([Guid]::NewGuid().ToString('N').Substring(0,6))"
$storage   = "newsfeedstor$([Guid]::NewGuid().ToString('N').Substring(0,6))"
$funcApp   = "newsfeed-func-$([Guid]::NewGuid().ToString('N').Substring(0,6))"
$plan      = "newsfeed-plan"
$webApp    = "newsfeed-web-$([Guid]::NewGuid().ToString('N').Substring(0,6))"

az group create -n $rg -l $loc
```

### 1. Cosmos DB (serverless)

```powershell
az cosmosdb create -n $cosmosAcc -g $rg `
  --capabilities EnableServerless --locations regionName=$loc
az cosmosdb sql database create -a $cosmosAcc -g $rg -n newsfeed
az cosmosdb sql container create -a $cosmosAcc -g $rg -d newsfeed `
  -n articles --partition-key-path "/feedCategory"

$cosmosEndpoint = az cosmosdb show -n $cosmosAcc -g $rg --query documentEndpoint -o tsv
$cosmosKey      = az cosmosdb keys list -n $cosmosAcc -g $rg --query primaryMasterKey -o tsv
```

### 2. Function App (Linux, Python 3.11, consumption)

```powershell
az storage account create -n $storage -g $rg -l $loc --sku Standard_LRS
az functionapp create -n $funcApp -g $rg --storage-account $storage `
  --consumption-plan-location $loc --runtime python --runtime-version 3.11 `
  --functions-version 4 --os-type Linux

az functionapp config appsettings set -n $funcApp -g $rg --settings `
  COSMOS_ENDPOINT=$cosmosEndpoint `
  COSMOS_KEY=$cosmosKey `
  COSMOS_DATABASE=newsfeed `
  COSMOS_CONTAINER=articles `
  RSS_SCHEDULE_CRON="0 0 */10 * * *"

cd functions
func azure functionapp publish $funcApp --python
cd ..
```

### 3. Web App (Linux, Node 20, App Service)

```powershell
az appservice plan create -n $plan -g $rg --sku B1 --is-linux
az webapp create -n $webApp -g $rg --plan $plan --runtime "NODE:20-lts"

az webapp config appsettings set -n $webApp -g $rg --settings `
  COSMOS_ENDPOINT=$cosmosEndpoint `
  COSMOS_KEY=$cosmosKey `
  COSMOS_DATABASE=newsfeed `
  COSMOS_CONTAINER=articles `
  SCM_DO_BUILD_DURING_DEPLOYMENT=true `
  WEBSITES_PORT=3000

cd web_app
npm install
npm run build
Compress-Archive -Path * -DestinationPath ../web_app.zip -Force
cd ..
az webapp deploy -g $rg -n $webApp --src-path web_app.zip --type zip
```

Browse to `https://<webApp>.azurewebsites.net`.

### Optional: harden with Managed Identity

For production, switch off the Cosmos primary key in favor of Azure AD auth:

1. Assign a system-assigned identity to both apps:
   ```powershell
   az functionapp identity assign -n $funcApp -g $rg
   az webapp identity assign      -n $webApp  -g $rg
   ```
2. Grant each principal the **Cosmos DB Built-in Data Contributor** role on the
   Cosmos account (`az cosmosdb sql role assignment create ...`).
3. Replace the key-based Cosmos client in `functions/cosmos_client.py` (Python)
   and `web_app/src/cosmos.js` (Node) with the `DefaultAzureCredential` variant
   from `azure-identity` / `@azure/identity`, then drop the `COSMOS_KEY`
   app setting.

## Future improvements

- TTL or a janitor function to age out `not_interested` articles.
- A settings page to edit `RSS_FEEDS` and `RSS_SCHEDULE_CRON` from the UI.
- Sign-in for multi-user use.
- Automated tests + CI.
