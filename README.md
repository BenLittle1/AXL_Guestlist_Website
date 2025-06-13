# Guest Access Portal

A secure and minimalist guest access portal for corporate offices, featuring a brutalist design aesthetic with separate interfaces for security personnel and administrative staff.

## Architecture

### Security Dashboard (`index.html`)
- **Primary Access Point**: For security personnel only
- **Date Navigation**: Navigate through different dates using arrow buttons
- **Guest Viewing**: See scheduled guests for any selected date
- **No Admin Access**: Cannot add, edit, or schedule guests

### Admin Panel (`admin.html`)
- **Administrative Access**: For staff who manage guest scheduling
- **Calendar Interface**: Full monthly calendar view
- **Guest Management**: Add guests to any date by clicking calendar days
- **Complete Control**: Full access to scheduling and management features

## Features

### Security Dashboard
- **Date Navigation**: Use left/right arrows to view different dates
- **Current Date Display**: Shows the selected date prominently
- **Guest List**: Clean table showing guest names and floor access for selected date
- **Read-Only Interface**: Security can view but not modify guest data

### Admin Panel
- **Monthly Calendar**: Navigate through months to schedule future guests
- **Visual Indicators**: Days with scheduled guests are marked with dots
- **Easy Scheduling**: Click any day to add a new guest
- **Guest Management**: Simple form for adding guest name and floor access

## Design Philosophy

### Visual Style
- **Monochromatic Palette**: Pure white background (#FFFFFF), black text (#000000), gray accents (#CCCCCC, #F5F5F5)
- **Typography**: Clean Inter font family with strong weight hierarchy
- **Layout**: Grid-based structure with abundant white space
- **Minimalism**: No photos, icons, or decorative elements

### Security-First Design
- **Separate Interfaces**: Clear separation between security viewing and admin management
- **Role-Based Access**: Different URLs for different user types
- **Clean Information Display**: Easy-to-read guest information for security personnel

## How to Use

### For Security Personnel
1. **Access**: Open `index.html` in your browser
2. **View Today**: Starts showing today's date and guests automatically
3. **Navigate Dates**: 
   - Click **←** to view previous day
   - Click **→** to view next day
4. **Guest Information**: See guest names and their floor access permissions
5. **No Modification**: Interface is read-only for security purposes

### For Administrative Staff
1. **Access**: Open `admin.html` in your browser
2. **Navigate Calendar**: Use left/right arrows to change months
3. **Schedule Guests**:
   - Click on any date in the calendar
   - Enter guest's full name
   - Specify floor access number
   - Click "ADD GUEST" to save
4. **Visual Indicators**: Days with guests show small dots
5. **Today Highlight**: Today's date is highlighted in black

## Technical Details

### File Structure
```
├── index.html          # Security Dashboard (read-only)
├── admin.html          # Admin Panel (full access)
├── styles.css          # Shared design system
├── security.js         # Security dashboard functionality
├── admin.js            # Admin panel functionality
└── README.md           # This documentation
```

### Data Storage
- **Shared Storage**: Both interfaces use the same localStorage data
- **Real-time Sync**: Changes in admin panel immediately visible in security dashboard
- **Persistent Data**: All guest information saved locally in browser
- **Data Format**: Each guest includes name, floor access, and timestamp

### Security Features
- **URL Separation**: Different pages for different roles
- **Read-Only Security**: Security interface cannot modify data
- **No Cross-Navigation**: Security cannot access admin features from their interface

## Access URLs

### Security Personnel
```
http://your-domain/index.html
```
- Read-only guest viewing
- Date navigation
- No scheduling capabilities

### Administrative Staff
```
http://your-domain/admin.html
```
- Full calendar interface
- Guest scheduling and management
- Complete admin control

## Setup Instructions

### Local Development
1. **Download Files**: Save all files to a local directory
2. **Security Access**: Open `index.html` for security dashboard
3. **Admin Access**: Open `admin.html` for admin panel
4. **No Dependencies**: Works directly in any modern browser

### Web Server Deployment
1. **Upload Files**: Place all files in web server directory
2. **Configure Access**: Set up appropriate URL routing if needed
3. **Security URLs**: Distribute correct URLs to appropriate personnel
4. **Browser Compatibility**: Works in Chrome, Firefox, Safari, Edge

## Example Workflow

### Admin Scheduling
```
1. Admin opens admin.html
2. Clicks on tomorrow's date
3. Adds "John Smith, Floor 5"
4. Guest is saved to system
```

### Security Verification
```
1. Security opens index.html
2. Uses arrow to navigate to tomorrow
3. Sees "John Smith, Floor 5" listed
4. Verifies guest access appropriately
```

## Design Inspiration

The visual design maintains the brutalist aesthetic while providing clear role separation:
- **High contrast** black and white color scheme
- **Bold typography** for easy reading at security desks
- **Functional minimalism** without decorative elements
- **Professional appearance** appropriate for corporate environments
- **Clear information hierarchy** for quick guest verification 