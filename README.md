# YellowPages Scraper with SQLite Persistence

A Node.js CLI tool using Puppeteer to identify high-potential leads (businesses without a website but with a phone number) and store them in a local SQLite database.

## Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js
- Puppeteer dependencies (automatically handled in most environments)

## Installation

```bash
bun install
```

## Usage

The tool operates in two main modes: **Scrape** and **Export**.

### 1. Scrape Mode
Scrape YellowPages for businesses based on a search term and location.

```bash
# Basic usage
bun scraper.js --search="Plumbers" --location="NC"

# With a custom page limit (default is 5)
bun scraper.js --search="Dentists" --location="NC" --limit=10

# Using aliases
bun scraper.js -s "Roofing" -l "NC" -m 20
```

**Options:**
- `--search`, `-s`: Business category or name.
- `--location`, `-l`: City, State, or Zip code.
- `--limit`, `-m`: Maximum number of pages to navigate (prevents infinite loops).

### 2. Export Mode
Query the local SQLite database and output all unique leads to a JSON file.

```bash
bun scraper.js --export-json
```
This generates or updates `leads.json` in the root directory.

## How it Works

1. **Filtering**: The scraper only saves businesses that **lack a "Website" link** but **have a phone number**.
2. **Deep Scrape**: For every potential lead found, the tool visits the business's profile page to attempt to find an email address.
3. **Duplicate Prevention**: Every listing's unique YellowPages URL is stored in a SQLite database (`leads.db`). Before scraping a profile or saving a lead, the tool checks the database to ensure it hasn't been processed before.
4. **Resilience**: Includes navigation timeouts and error handling to ensure the database connection closes gracefully even if the browser crashes.

## Data Schema

The following data is collected for each lead:
- `business_name`
- `phone`
- `email` (if available on the profile page)
- `category`
- `yellowpages_url` (Unique ID)
- `timestamp`
