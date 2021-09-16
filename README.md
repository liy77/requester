# Discord Requester

## Install

```sh
# Using yarn
yarn add JustAWaifuHunter/requester#master

# Using npm
npm install JustAWaifuHunter/requester#master
```

## Usage

```js
const Requester = require("requester")

const requestHandler = new Requester("Authorization token", {
    headers: // YOUR HEADERS
})

requestHandler.request("endpoint").then((res) => {
    // Your code
})
```
