# News Feed
An application to help me to stay up to to date with the latest topics.

# Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────────┐
│   News RSS Feed  │ ──► │   Azure Functions    │ ──► │         Database         │
└──────────────────┘     │----------------------│     └──────────────────────────┘
                         │ - Read RSS feed      │                  ▲
                         │ - Get latest news    │                  │
                         │ - Save new articles  │                  │
                         └──────────────────────┘                  │ Load / Update
                                                                   │
                                                                   │
                                                                   │
                                                      ┌──────────────────────────┐
                                                      │         Web App          │
                                                      │--------------------------│
                                                      │ - Load articles          │
                                                      │ - Show content           │
                                                      │ - Track user actions     │
                                                      │ - Update metadata        │
                                                      └──────────────────────────┘
                                                                   ▲
                                                                   │ Use app
                                                                   │
                                                      ┌──────────────────────────┐
                                                      │          Users           │
                                                      └──────────────────────────┘
```