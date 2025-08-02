# TLDR Commands - Simplified Command Line Reference

A minimal, fast-loading collection of simplified Linux/Unix man pages based on TLDR-pages.

Welcome to **TLDR Commands**, a fast, lightweight, and user-friendly web application delivering simplified and practical command line reference sheets. Designed for system administrators, developers, and DevOps professionals, this project provides concise, example-driven summaries of thousands of commands spanning Linux, Windows, macOS, Android, BSD, and more.

## Features

- **Comprehensive Coverage**: Over 5,900+ curated commands collected from the official [tldr-pages](https://github.com/tldr-pages/tldr) repository.
- **Multi-Platform Support**: Commands organized by platform including Linux, Windows, macOS, and BSD variants.
- **Instant Search**: Smart, cross-platform command search with live suggestions.
- **Offline Ready**: Progressive Web App (PWA) enabling offline usage after initial load.
- **Responsive Design**: Mobile-friendly, accessible, and optimized for all screen sizes.
- **Light/Dark Mode**: Theme toggle with OS preference support for seamless user experience.
- **Regular Updates**: Daily synchronized with official tldr-pages for fresh content.
- **Ad Integration**: Google AdSense ready with recommended ads and compliance best practices.

## Getting Started

### Prerequisites

- A modern web browser supporting JavaScript and Service Workers.
- (Optional) A web server or static site host to serve the files.
- (Optional) Google AdSense account for monetization (ads integration).

### Installation

1. Clone this repository:

```bash
git clone https://github.com/your-username/tldr-commands.git
cd tldr-commands
```

2. Place `tldr-pages.zip` (official data) in the root directory or configure to fetch from the official source.

3. Serve the site using any static server (e.g., `live-server`, NGINX, Apache):

```bash
live-server
```
or
```bash
npx serve .
```

4. Open your browser and navigate to `http://localhost:PORT`.

### Deployment

- Host on GitHub Pages, Netlify, Vercel, or any static hosting platform.
- Configure the base URL to root `/`.
- Ensure assets (`style.css`, `app.js`) use absolute path references (`/style.css`).
- Setup HTTPS and Service Worker support for best PWA experience.

## Usage

- Type a command or keyword in the search bar; commands from all selected platforms are queried.
- Click categories on the sidebar to browse commands per topic.
- Use the theme toggle in the header to switch between light and dark modes.
- Commands display example usage with clear formatting.
- Install as a PWA on supported browsers to use offline.

## Project Structure

```
/
├── index.html           # Main HTML file
├── style.css            # Stylesheet with responsive and dark mode styling
├── app.js               # JavaScript controlling UI, search, theming, PWA, and ads
├── manifest.json        # PWA manifest file for installability
├── tldr-pages.zip       # Official command pages database (zipped)
├── favicon.ico, .svg    # Site icons
└── README.md            # This file
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`feature/new-command`).
3. Make your changes and include tests if applicable.
4. Submit a pull request describing your changes.

Refer to the [CONTRIBUTING.md](https://github.com/tldr-pages/tldr/blob/main/CONTRIBUTING.md) of the official tldr-pages project for data formatting guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Data sourced and synced from [tldr-pages](https://github.com/tldr-pages/tldr).
- Thanks to the open-source community for contributions and support.
- Google AdSense integration as per Google’s policies.

## Contact

Website: [https://www.magnetbyte.com](https://www.magnetbyte.com)  
Project maintained by MagnetByte.

Feel free to customize this README to add your own sections or details!
