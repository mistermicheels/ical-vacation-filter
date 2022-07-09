Project status:

-   🛑 Not actively maintained
-   🔒 Not looking for code contributions from other developers

# ical-vacation-filter

Take an Outlook iCal feed and keep only the out-of-office events.

Filtered feed URL: `https://ical-vacation-filter.herokuapp.com/filter?source=%source_feed_URL%`.

It is recommended to encode the source feed URL using EncodeURIComponent.

Note: If you struggle to get your favourite calendar software to subscribe to the resulting feed URL, try putting the URL behind a URL shortener.

## Development

You can run the application with automatic restarts using `npm run start`.

The code is not too interesting, except for the stream processing part:

-   We get the source data from `axios` as a stream
-   We use async iterator syntax to iterate over the source stream
-   We inspect the first chunk of the stream to perform sanity checks _before_ setting response headers
-   We use an async generator function to create the resulting filtered stream

The use of streams allows us to keep memory overhead as small as possible when processing iCal content. It also allows us to reject non-iCal content without first having to download it. Meanwhile, the async iterator syntax and async generator function allow us to keep the data filtering code relatively simple and readable.

## Suggestions for improvement

-   Add frontend that turns source feed URL into copyable filtered feed URL
-   Add automated tests
