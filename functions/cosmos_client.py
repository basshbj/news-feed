"""Lazy Cosmos DB client + container bootstrap."""
from __future__ import annotations

import os
import threading

from azure.cosmos import CosmosClient, PartitionKey

_lock = threading.Lock()
_container = None


def _build_container():
    endpoint = os.environ["COSMOS_ENDPOINT"]
    key = os.environ["COSMOS_KEY"]
    db_name = os.environ.get("COSMOS_DATABASE", "newsfeed")
    container_name = os.environ.get("COSMOS_CONTAINER", "articles")

    client = CosmosClient(endpoint, credential=key)
    db = client.create_database_if_not_exists(id=db_name)
    return db.create_container_if_not_exists(
        id=container_name,
        partition_key=PartitionKey(path="/feedCategory"),
    )


def get_container():
    global _container
    if _container is None:
        with _lock:
            if _container is None:
                _container = _build_container()
    return _container


def exists(article_id: str) -> bool:
    """Return True if an article with this id exists in any feed partition."""
    query = "SELECT VALUE COUNT(1) FROM c WHERE c.id = @id"
    params = [{"name": "@id", "value": article_id}]
    results = list(
        get_container().query_items(
            query=query,
            parameters=params,
            enable_cross_partition_query=True,
        )
    )
    return bool(results) and results[0] > 0


def insert(item: dict) -> None:
    get_container().create_item(body=item)
