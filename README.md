Project status:

-   🛑 Not actively maintained
-   🔒 Not looking for code contributions from other developers

# ical-vacation-filter

Take an Outlook iCal feed and keep only the out-of-office events.

Filtered feed URL: `https://ical-vacation-filter.herokuapp.com/filter?source=%source_feed_URL%`.

It is recommended to encode the source feed URL using EncodeURIComponent.

Note: If you struggle to get your favourite calendar software to subscribe to the resulting feed URL, try putting the URL behind a URL shortener.

## Suggestions for improvement

-   Validate that source is provided
-   Validate that source actually returns an iCal feed and not something else
-   Add timeout and potentially max source feed size
-   Provide nice error messages in case of timeout, invalid source URL, ...
-   Add frontend that turns source feed URL into copyable filtered feed URL
-   Process source feed as a stream so we can filter huge iCal feeds with minimal memory overhead
-   Add automated tests
