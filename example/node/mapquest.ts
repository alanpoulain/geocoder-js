/* eslint-disable no-console */
import GeocoderJS from "../../dist/GeocoderJS";

const mapQuestGeocoder = GeocoderJS.createGeocoder({
  provider: "mapquest",
  apiKey: "Fmjtd%7Cluurnu6al1%2Cbg%3Do5-9wbg94",
});
mapQuestGeocoder.geocode(
  "1600 Pennsylvania Ave NW, Washington, DC",
  (result) => {
    console.log(result);
  }
);

mapQuestGeocoder.geodecode("44.915", "-93.21", (result) => {
  console.log(result);
});
