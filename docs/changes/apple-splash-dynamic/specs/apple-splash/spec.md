## ADDED Requirements

### Requirement: Dynamically generated launch screen

The system SHALL expose a route that renders an Apple PWA launch screen as a PNG image at an exact pixel size taken from the request, so a single handler serves every device size without stored image files.

#### Scenario: Render at the requested device size

- **WHEN** the route is requested with a width and height that encode a supported device's exact pixel resolution
- **THEN** the response SHALL be a PNG image whose dimensions equal that exact width and height
- **AND** the image SHALL render the VolleyBro "V" mark centered on a solid background filled with the `--primary` brand color

##### Example: iPhone 15 Pro Max portrait

- **GIVEN** the device pixel resolution 1290x2796
- **WHEN** the launch-screen route is requested for size 1290x2796
- **THEN** the returned PNG SHALL be exactly 1290 pixels wide and 2796 pixels tall

#### Scenario: Reject an unsupported size

- **WHEN** the route is requested with a size that is not a registered device resolution
- **THEN** the system SHALL respond with HTTP 404 and SHALL NOT return an image

### Requirement: V mark composition

The launch screen SHALL render the "V" mark as two filled SVG path arms extracted from the Saira Stencil One font, independent of any external image asset or runtime font dependency.

#### Scenario: Mark colors and shape

- **WHEN** the launch screen is rendered
- **THEN** the left arm of the "V" SHALL be filled with `#F6F4F5` and the right arm SHALL be filled with `#FC7A56`
- **AND** the mark SHALL be drawn as inline SVG paths with hardcoded glyph coordinates, not loaded from a raster file or font at request time
- **AND** the SVG SHALL be sized to 25% of the shorter device dimension

### Requirement: Per-device startup-image registration

The app root layout SHALL register one Apple startup image per supported device configuration, each pairing the device `media` query with the launch-screen route URL for that device's exact size.

#### Scenario: Registration points at the route

- **WHEN** the document head is produced for the app
- **THEN** every `apple-touch-startup-image` entry SHALL reference the launch-screen route with the device's exact pixel size
- **AND** no `apple-touch-startup-image` entry SHALL reference a stored file under the public `apple-splash` directory

#### Scenario: Device coverage spans current iPhone and iPad

- **WHEN** the startup images are registered
- **THEN** the set of device `media` queries SHALL cover iPhone models through the iPhone 17 generation (including iPhone Air) and common iPad sizes
- **AND** every device configuration covered before this change SHALL remain covered

### Requirement: No stored splash assets

Stored Apple splash PNG files SHALL NOT be served by the application.

#### Scenario: Static splash directory removed

- **WHEN** the application is built
- **THEN** the public `apple-splash` directory SHALL NOT contain pre-rendered splash PNG files
