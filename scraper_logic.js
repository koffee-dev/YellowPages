const puppeteer = require('puppeteer');
const { insertLead, leadExists } = require('./database');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

async function scrapeYellowPages(search, location, limit = 5) {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);

  const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(search)}&geo_location_terms=${encodeURIComponent(location)}`;
  console.log(`Searching for: ${search} in ${location} (Max pages: ${limit})`);
  
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    let hasNext = true;
    let pageCount = 0;
    while (hasNext && pageCount < limit) {
      pageCount++;
      console.log(`Scraping page ${pageCount}...`);
      await page.waitForSelector('.v-card', { timeout: 10000 }).catch(() => {
        console.log('No listings found or timeout.');
        hasNext = false;
      });
      if (!hasNext) break;

      const listings = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.v-card'));
        return items.map(item => {
          const nameEl = item.querySelector('a.business-name');
          const websiteEl = item.querySelector('a.track-visit-website');
          const phoneEl = item.querySelector('.phones.phone.primary');
          const categoryEl = item.querySelector('.categories');
          const ypUrlEl = item.querySelector('a.business-name');

          return {
            business_name: nameEl ? nameEl.innerText : null,
            website: websiteEl ? websiteEl.getAttribute('href') : null,
            phone: phoneEl ? phoneEl.innerText : null,
            category: categoryEl ? categoryEl.innerText : null,
            yellowpages_url: ypUrlEl ? 'https://www.yellowpages.com' + ypUrlEl.getAttribute('href') : null
          };
        });
      });

      console.log(`Found ${listings.length} listings on current page.`);

      for (const listing of listings) {
        if (!listing.yellowpages_url) continue;

        if (await leadExists(listing.yellowpages_url)) {
          continue;
        }

        // Target: Only save results where the Website link is missing, but a Phone Number exists
        if (!listing.website && listing.phone) {
          console.log(`Potential lead: ${listing.business_name}. Visiting profile page for email...`);
          
          let email = null;
          const detailPage = await browser.newPage();
          try {
            await detailPage.setUserAgent(USER_AGENT);
            await detailPage.goto(listing.yellowpages_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Try to find email link or text
            email = await detailPage.evaluate(() => {
              const emailEl = document.querySelector('a.email-business');
              if (emailEl) {
                const href = emailEl.getAttribute('href');
                if (href && href.startsWith('mailto:')) {
                  return href.replace('mailto:', '');
                }
              }
              return null;
            });
          } catch (e) {
            console.error(`Error visiting profile page for ${listing.business_name}:`, e.message);
          } finally {
            await detailPage.close();
          }

          const lead = {
            business_name: listing.business_name,
            phone: listing.phone,
            email: email,
            category: listing.category,
            yellowpages_url: listing.yellowpages_url
          };

          insertLead(lead);
          console.log(`Saved lead: ${listing.business_name} (Email: ${email || 'Not found'})`);
        }
      }

      // Pagination
      if (pageCount >= limit) {
        console.log(`Reached limit of ${limit} pages.`);
        hasNext = false;
        break;
      }

      const nextButton = await page.$('a.next.ajax-page');
      if (nextButton) {
        console.log('Moving to next page...');
        try {
          await Promise.all([
            page.click('a.next.ajax-page'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 })
          ]);
        } catch (e) {
          console.error(`Error navigating to next page:`, e.message);
          // If navigation times out, we might still be on the same page or partially loaded.
          // Try to continue, but if it keeps failing, hasNext will eventually become false.
          hasNext = false; 
        }
      } else {
        hasNext = false;
        console.log('No more pages.');
      }
    }
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeYellowPages };
