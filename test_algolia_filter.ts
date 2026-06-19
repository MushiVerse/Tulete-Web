import { algoliasearch } from 'algoliasearch';
import dotenv from 'dotenv';
dotenv.config();

const APP_ID = process.env.VITE_ALGOLIA_APP_ID || 'IU2RKVQF8F';
const SEARCH_KEY = process.env.VITE_ALGOLIA_SEARCH_KEY || '25b7fb23ef5b9383d5d399c29a1472ad';

const client = algoliasearch(APP_ID, SEARCH_KEY);

const testSearch = async () => {
  try {
    const { results } = await client.search({
      requests: [
        {
          indexName: 'tulete_items',
          query: '',
          filters: 'recordType:product',
          hitsPerPage: 5
        }
      ]
    });
    console.log("Filtered by recordType:product => hits: ", results[0].hits.length);
  } catch (err) {
    console.error("Filter failed: ", err.message);
  }

  try {
    const { results } = await client.search({
      requests: [
        {
          indexName: 'tulete_items',
          query: '',
          hitsPerPage: 5
        }
      ]
    });
    console.log("Unfiltered => hits: ", results[0].hits.length);
  } catch (err) {
    console.error("Unfiltered failed: ", err.message);
  }
};

testSearch();
