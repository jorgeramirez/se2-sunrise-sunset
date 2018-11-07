const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY;
const MAPQUEST_URL = `http://www.mapquestapi.com/geocoding/v1/address?key=${API_KEY}`;
const SS_API = 'https://api.sunrise-sunset.org/json?';

// tiny utilities function
const lowerNoSpace = s => s.toLowerCase().replace(/\s/g, '');
const encodeCity = city =>
  encodeURIComponent(city.name) + ',' + encodeURIComponent(city.state);

// helth check
app.get('/', (req, res) => {
  res.json({ msg: 'Hello world!' });
});

// cities "db"
let cities = [];

// create city service
app.post('/cities', async (req, res) => {
  const { name, state } = req.body;

  if (!name || !state) {
    res.status(400).send({ error: 'Name and state are required parameters.' });
    return;
  }
  const id = `${lowerNoSpace(name)}-${lowerNoSpace(state)}`;
  const newCity = { id, name, state };
  cities.push(newCity);
  res.json(newCity);
});

// get /cities service. Returns sunrise/sundown information.
app.get('/cities', async (req, res) => {
  // fetch lat/lng info
  let promises = cities.map(city => {
    // we cache the lat/lng info
    if (city.latLng) {
      console.info(`returned cached lat/lng info for ${city.id}`);
      return city;
    }
    return fetch(`${MAPQUEST_URL}&location=${encodeCity(city)}`)
      .then(res => res.json())
      .then(json => json.results[0].locations[0].latLng)
      .then(latLng => ({ ...city, latLng }))
      .catch(err => console.error(err));
  });
  cities = await Promise.all(promises);

  // fetch sunrise/sunset info
  promises = cities.map(city =>
    fetch(`${SS_API}&lat=${city.latLng.lat}&lng=${city.latLng.lng}`)
      .then(res => res.json())
      .then(json => ({
        ...city,
        sunrise: json.results.sunrise,
        sunset: json.results.sunset
      }))
      .catch(err => console.error(err))
  );
  let response = await Promise.all(promises);
  res.json(response);
});

module.exports = app;
