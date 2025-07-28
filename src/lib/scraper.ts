import axios from 'axios';
import * as cheerio from 'cheerio';
import { ContactInfo } from './types';
import {blacklistedWebsites, blacklistedDomains, blacklistedExtensions} from './blacklists';

/*
interface ScrapeResult {
    [url: string]: string[];
}*/

export function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi;
    const matches = text.match(emailRegex);
    let emails: string[] = matches ? [...matches] : [];

    if (!emails.length) return [];

    emails.map(email => email.toLowerCase());

    // Blacklist certain file extensions to filter out false positives
    
    emails = emails.filter((email: string) => !blacklistedExtensions.test(email));

    // Remove agency and management email addresses
    
    emails = emails.filter((email: string) => !blacklistedDomains.test(email));

    // Lowercase
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
            } catch {
                // Ignore invalid URLs
            }
        }
    });
    return links;
}

export function extractTstackLinks(text: string): string {
    const tstackRegex = /(https:\/\/)?(www\.)?tstack\.app\/[a-zA-Z0-9_\-]+/g;
    const match = text.match(tstackRegex);
    return match ? match[0] : '';
}

export function extractSoundCloundLinks(text: string): string {
    const soundCloudRegex = /(https:\/\/)?(www\.)?soundcloud\.com\/[a-zA-Z0-9_\-]+/g;
    const match = text.match(soundCloudRegex);
    return match ? match[0] : '';
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
    } catch {
        // Handle errors silently
        return null;
    }
}

// TODO : return content after x seconds even if not finished
export async function scrapeEmails(startUrl: string): Promise<string[]> {
    const emailsFound = new Set();
    const visited = new Set();
    const queue = [];

    const maxPages = 15;
    let pagesScraped = 0;
    let emailFound = false;

    const parsedUrl = new URL(startUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    // Start with the main page
    queue.push(startUrl);

    // Prepare potential contact page URLs
    const contactPaths = ['contact', 'contact-us', 'contactus', 'about', 'about-us', 'aboutus', 'impressum'];
    for (const path of contactPaths) {
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
        for (const link of links) {
            if (!visited.has(link)) {
                queue.push(link);
            }
        }
    }

    return Array.from(emailsFound) as string[];
}

export async function scrapeWebsite(url: string): Promise<ContactInfo> {
    if (!url || blacklistedWebsites.test(url)) return {};
    const controller = new AbortController(); 
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ContactFinder/1.0)'
            },
            signal: controller.signal
        })

        clearTimeout(timeoutId); // Clear the timeout

        if (!response.ok) {
            console.error(`Failed to fetch website: ${url} - Status: ${response.status} ${response.statusText}`);
            return {};
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let instagram = '';
        let demoEmail = '';
        let tstack = '';

        // Extract Instagram link from meta tags (more reliable)
        $('meta[property="og:url"]').each((i, elem) => {
            const content = $(elem).attr('content');
            if (content && content.includes('instagram.com')) {
                instagram = content;
                return false; // Stop after first match
            }
        });

        // Extract all links and search for contact info
        const links: string[] = [];
        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                links.push(href);
            }
        });

        for (const link of links) {
            if (link.includes("instagram.com") && !instagram) instagram = link;
            if (link.includes("tstack.app") && !tstack) tstack = link;
        }

        //Extract email addresses, will stop after 5 seconds
        let extractedEmails: string[] = [];
        try {
            // Define a timeout duration for scrapeEmails
            const scrapeEmailsTimeout = 5000;
            const scrapeEmailsPromise = scrapeEmails(url);

            const timeoutPromise = new Promise<string[]>((resolve) => {
                setTimeout(() => {
                    console.error(`scrapeEmails timed out after ${scrapeEmailsTimeout}ms for ${url}`);
                    resolve([]); // Resolve with empty array on timeout
                }, scrapeEmailsTimeout);
            });

            extractedEmails = await Promise.race([scrapeEmailsPromise, timeoutPromise]);
        } catch (error) {
            console.error(`Error during scrapeEmails execution for ${url}:`, error);
            extractedEmails = []; // Ensure emails are empty if an error occurs
        }
        demoEmail = extractedEmails.join('; ');

        const result = { url, instagram, demoEmail, tstack };

        return result;
    } catch (error) {
        console.error(`Error scraping website ${url}:`, error);
        return {};
    }
}

/* // Exemple of use 
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
} */