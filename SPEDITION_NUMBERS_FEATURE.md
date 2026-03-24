# Spedition Numbers Feature Implementation

## Overview
Implemented functionality to collect, store, and display unique parcel tracking numbers (spedition numbers) for orders. The tracking numbers are automatically extracted from position statuses and stored as JSON in the order table.

## Database Changes

### Migration Required
Run the SQL migration to add the `spedition_numbers` field:
```sql
ALTER TABLE `order` 
ADD COLUMN `spedition_numbers` JSON DEFAULT NULL 
COMMENT 'Stores unique parcel tracking codes as JSON array';
```

**File:** `migration_add_spedition_numbers.sql`

### Data Format
The `spedition_numbers` field stores an array of unique parcel codes:
```json
["DPD 123456789", "UPS 987654321", "DHL AB123456789CD"]
```

## Backend Changes

### 1. Database Layer (`db/statuses.js`)
**Function:** `syncOrderFromStatuses(userIdent, orderIdx)`

**Changes:**
- Uses SQL subquery with `JSON_ARRAYAGG(DISTINCT ...)` to collect unique parcel codes
- Updates the order's `spedition_numbers` field in the same UPDATE statement as `delivery_date` and `prod_status`
- Filters out NULL and empty parcel codes directly in SQL

**Code highlights:**
```javascript
o.spedition_numbers = (
    SELECT JSON_ARRAYAGG(DISTINCT ps.parcel_code)
    FROM position_statuses ps
    WHERE ps.user_ident = ? AND ps.order_idx = ?
      AND ps.parcel_code IS NOT NULL
      AND ps.parcel_code != ''
)
```

**Key points:**
- `DISTINCT` ensures uniqueness at SQL level
- Collected for specific `order_idx` and `user_ident` (per order, per user)
- Stored as JSON array natively by MySQL's `JSON_ARRAYAGG`
- Fully consistent with `delivery_date` and `prod_status` logic

### 2. Database Queries (`db/orders.js`)
**Updated queries to include `spedition_numbers` field:**
- `getUserOrders()` - for both organization and user orders
- `searchUserOrders()` - for search functionality

**Added field to SELECT statements:**
```sql
SELECT o.id, ..., o.spedition_numbers, ...
FROM `order` o
```

### 3. Service Layer (`services/prodStatus.js`)
**New function:** `parseSpeditionNumbers(speditionNumbersJson)`

**Functionality:**
- Parses JSON string or array of parcel codes
- Extracts carrier and tracking code from each entry
- Generates tracking URLs for supported carriers (DPD, UPS, DHL)
- Returns structured array with carrier info and href

**Return format:**
```javascript
[
  {
    carrier: 'DPD',
    code: '123456789',
    href: 'https://www.dpd.com.pl/tracking/?parcelNumber=123456789',
    fullCode: 'DPD 123456789'
  },
  // ...
]
```

### 4. Routes (`routes/orders.js`)
**Updated endpoints:**
- `/history` - Standard order history
- `/organization-orders?history=true` - Organization order history
- `/search` - Search functionality

**Processing logic:**
```javascript
// Parse spedition numbers for each order before rendering
if (orders && orders.length > 0) {
    orders.forEach(order => {
        if (order.spedition_numbers) {
            order.parsedSpeditionNumbers = parseSpeditionNumbers(order.spedition_numbers);
        }
    });
}
```

## Frontend Changes

### 1. Templates
**Updated templates:**
- `templates/orders_history.njk`
- `templates/orders_history_owner.njk`
- `templates/owner/organization_orders_history.njk`

**Changes:**
1. Added new table header column: "Numery przesyłek" (Tracking Numbers)
2. Added new table cell displaying tracking numbers as clickable badges

**Template code:**
```njk
<th scope="col">{{ __('orders.tracking_numbers') or 'Numery przesyłek' }}</th>

<td>
    {% if order.parsedSpeditionNumbers and order.parsedSpeditionNumbers.length > 0 %}
        {% for tracking in order.parsedSpeditionNumbers %}
            {% if tracking.href %}
                <a href="{{ tracking.href }}" target="_blank" rel="noopener noreferrer" 
                   onclick="event.stopPropagation()" 
                   class="badge bg-primary text-white text-decoration-none me-1 mb-1" 
                   style="font-size: 0.85rem;">
                    {{ tracking.carrier }} {{ tracking.code }}
                </a>
            {% else %}
                <span class="badge bg-secondary me-1 mb-1" style="font-size: 0.85rem;">
                    {{ tracking.fullCode }}
                </span>
            {% endif %}
        {% endfor %}
    {% else %}
        <span class="text-muted">-</span>
    {% endif %}
</td>
```

### 2. Client-Side JavaScript (`public/scripts/orders.js`)
**Updated functions:**
- `renderTableRow(order)` - Desktop table rendering
- `renderMobileCard(order)` - Mobile card rendering

**Changes:**
- Added tracking numbers rendering for search results
- Generates clickable badges with tracking URLs
- Prevents event propagation on link clicks
- Handles orders without tracking numbers gracefully

## UX Design Principles Applied

### Nielsen Heuristics Compliance:
1. **Visibility of system status** - Tracking numbers clearly displayed when available
2. **User control and freedom** - Links open in new tab, don't navigate away
3. **Consistency and standards** - Uses Bootstrap badges, consistent with existing design
4. **Recognition rather than recall** - Carrier name shown with tracking code
5. **Error prevention** - Handles missing/null data gracefully
6. **Aesthetic and minimalist design** - Compact badge design, color-coded by carrier

### Accessibility:
- Links have proper `rel="noopener noreferrer"` for security
- Visual distinction between different carriers (primary badges)
- Fallback display for unknown carriers (secondary badges)
- Mobile-responsive design

## Supported Carriers

The system generates tracking links for:
1. **DPD** - `https://www.dpd.com.pl/tracking/?parcelNumber=`
2. **UPS** - `https://www.ups.com/track?loc=en_US&tracknum=`
3. **DHL** - `https://www.dhl.com/en/express/tracking.html?AWB=`

Unknown carriers display the code without a link.

## Testing Checklist

### Backend:
- [ ] Run migration to add `spedition_numbers` column
- [ ] Test `syncOrderFromStatuses` with multiple statuses
- [ ] Verify unique codes are stored correctly
- [ ] Test with missing/null parcel codes
- [ ] Test JSON parsing in `parseSpeditionNumbers`

### Frontend:
- [ ] Verify tracking numbers appear in order history
- [ ] Test clicking tracking links (opens in new tab)
- [ ] Test with orders having no tracking numbers
- [ ] Test with multiple tracking numbers per order
- [ ] Test search functionality with tracking numbers
- [ ] Verify mobile view displays correctly
- [ ] Test owner/organization views

### Integration:
- [ ] Test full flow: status sync → database → display
- [ ] Verify carrier URL generation for DPD, UPS, DHL
- [ ] Test with duplicate parcel codes (should be filtered)
- [ ] Test with malformed parcel codes

## Files Modified

### Backend:
1. `db/statuses.js` - Updated `syncOrderFromStatuses()`
2. `db/orders.js` - Added `spedition_numbers` to queries
3. `services/prodStatus.js` - Added `parseSpeditionNumbers()`
4. `routes/orders.js` - Added parsing logic

### Frontend:
5. `templates/orders_history.njk` - Added tracking column
6. `templates/orders_history_owner.njk` - Added tracking column
7. `templates/owner/organization_orders_history.njk` - Added tracking column
8. `public/scripts/orders.js` - Updated rendering functions

### Database:
9. `migration_add_spedition_numbers.sql` - Migration script

## Future Enhancements

Potential improvements:
1. Add more carrier tracking URLs (GLS, InPost, etc.)
2. Add tracking status preview/tooltip
3. Export tracking numbers in PDF/Excel reports
4. Email notifications with tracking numbers
5. Tracking number search functionality
6. Bulk tracking status check

## Rollback Procedure

If issues occur:
1. Remove column: `ALTER TABLE \`order\` DROP COLUMN spedition_numbers;`
2. Revert code changes via git
3. Clear browser cache

## Notes

- The feature is backward compatible - orders without tracking numbers display "-"
- Duplicate tracking codes are automatically filtered using Set
- Empty/null parcel codes are ignored
- The feature works for all user types (regular users, owners, employees)
- Search functionality includes tracking numbers automatically
