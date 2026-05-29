'use strict';

const { CosmosClient } = require('@azure/cosmos');
const config = require('./config');

let containerPromise = null;

async function getContainer() {
  if (!containerPromise) {
    const client = new CosmosClient({ endpoint: config.cosmos.endpoint, key: config.cosmos.key });
    const { database } = await client.databases.createIfNotExists({ id: config.cosmos.database });
    const { container } = await database.containers.createIfNotExists({
      id: config.cosmos.container,
      partitionKey: { paths: ['/feedCategory'] },
    });
    containerPromise = Promise.resolve(container);
  }
  return containerPromise;
}

module.exports = { getContainer };
