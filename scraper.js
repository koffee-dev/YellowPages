#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const { scrapeYellowPages } = require('./scraper_logic');
const { getAllLeads, close } = require('./database');

const argv = yargs(hideBin(process.argv))
  .option('search', {
    alias: 's',
    type: 'string',
    description: 'Business category to search for (e.g., Plumbers)'
  })
  .option('location', {
    alias: 'l',
    type: 'string',
    description: 'Location for search (e.g., NY)'
  })
  .option('export-json', {
    type: 'boolean',
    description: 'Export all scraped leads to leads.json'
  })
  .option('limit', {
    alias: 'm',
    type: 'number',
    description: 'Maximum number of pages to scrape',
    default: 5
  })
  .help()
  .argv;

async function main() {
  if (argv['export-json']) {
    console.log('Exporting leads to leads.json...');
    try {
      const leads = getAllLeads();
      fs.writeFileSync('leads.json', JSON.stringify(leads, null, 2));
      console.log(`Successfully exported ${leads.length} leads to leads.json`);
    } catch (error) {
      console.error('Error during export:', error);
    } finally {
      close();
    }
    return;
  }

  const search = argv.search;
  const location = argv.location;
  const limit = argv.limit;

  if (!search || !location) {
    console.error('Error: Both --search and --location are required for scraping.');
    console.log('Example: node scraper.js --search="Plumbers" --location="NY"');
    process.exit(1);
  }

  try {
    await scrapeYellowPages(search, location, limit);
    console.log('Scraping completed successfully.');
  } catch (error) {
    console.error('An error occurred during scraping:', error);
  } finally {
    close();
  }
}

main();
