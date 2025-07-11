import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapeResult {
    [url: string]: string[];
}

export function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
    const matches = text.match(emailRegex);
    let emails: string[] = matches ? [...matches] : [];

    /*// Blacklist certain file extensions to filter out false positives
    const blacklistedExtensions = [
        '.jpg', '.jpeg', '.png', '.svg', '.gif',
        '.tga', '.bmp', '.zip', '.pdf', '.webp',
    ];

    emails = emails.filter((email: string) => {
        // Convert email and extensions to lowercase for case-insensitive comparison
        const lowerEmail = email.toLowerCase();
        return !blacklistedExtensions.some(ext => lowerEmail.endsWith(ext));
    }); */

    // Remove agency and management email addresses
    const blacklisedDomains = /agency|management|entertainment|talent|mgmt|booking|press|domain\.com/i;
    emails = emails.filter((email: string) => !blacklisedDomains.test(email));

    return emails;
}

function extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    $('a[href]').each((i, elem) => {
        let href = $(elem).attr('href');
        if (href) {
            // Remove URL fragments
            href = href.split('#')[0];
            try {
                // Resolve relative URLs using WHATWG URL
                const resolvedUrl = new URL(href, baseUrl).toString();
                // Ensure the link is on the same domain
                if (resolvedUrl.startsWith(baseUrl)) {
                    links.push(resolvedUrl);
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
    });
    return links;
}

async function fetchPage(pageUrl: string): Promise<string | null> {
    try {
        const response = await axios.get(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; EmailScraper/1.0)'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        // Handle errors silently
        return null;
    }
}

export async function scrapeEmails(startUrl: string): Promise<string[]> {
    const emailsFound = new Set();
    const visited = new Set();
    const queue = [];

    const maxPages = 40;
    let pagesScraped = 0;
    let emailFound = false;

    const parsedUrl = new URL(startUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    // Start with the main page
    queue.push(startUrl);

    // Prepare potential contact page URLs
    const contactPaths = ['contact', 'contact-us', 'contactus', 'about', 'about-us', 'aboutus', 'impressum'];
    for (let path of contactPaths) {
        const contactUrl = new URL(path, baseUrl).toString();
        // Some websites may expect these paths with or without trailing slashes
        queue.push(contactUrl);
        queue.push(contactUrl + '/');
    }

    while (queue.length > 0 && pagesScraped < maxPages && !emailFound) {
        const currentUrl = queue.shift();
        if (!currentUrl || visited.has(currentUrl)) {
            continue;
        }
        visited.add(currentUrl);

        const html = await fetchPage(currentUrl);
        if (!html) {
            continue;
        }
        pagesScraped++;

        // Extract emails from page
        const emails: string[] = extractEmails(html);
        if (emails.length > 0) {
            emails.forEach((email: string) => {
                emailsFound.add(email);
            });
            emailFound = true;
            break; // Stop scraping this website
        }

        // Extract links from page
        const links = extractLinks(html, baseUrl);
        for (let link of links) {
            if (!visited.has(link)) {
                queue.push(link);
            }
        }
    }

    return Array.from(emailsFound) as string[];
}

async function main(websiteUrls: string[]): Promise<void> {
    const results: Record<string, string[]> = {};
    const concurrencyLimit = 5;

    for (let i = 0; i < websiteUrls.length; i += concurrencyLimit) {
        const batch = websiteUrls.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(async (url: string) => {
            const emails = await scrapeEmails(url);
            results[url] = emails;
        });
        await Promise.all(batchPromises);
    }

    console.log(results);
}

// Example usage
const testWebsiteUrls = [
    /* 'http://ballardproperty.com.au/home',
    'https://www.cohenfarquharson.com.au/',
    'https://www.metrocommercial.com.au/',
    'https://nuaskinbliss.com/',
    'https://ahoyclub.com/',
    'https://www.cyclehire.com.au/',
    'https://www.moveyourself.com.au/index.php?page=depot&code=RANDC',
    'http://www.mccyclery.com.au/',
    'http://www.oneroundentertainment.com.au/',
    'http://sydneyresurfacingservices.com.au/', */
    'http://andersensicecream.com/australia/',
    'http://www.thecoogeeview.com.au/',
    //'https://www.instagram.com/coogeesurfandco'
];

main(testWebsiteUrls);