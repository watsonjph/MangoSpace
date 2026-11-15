# RADARSAT-1 catalogue check for Cebu and Bohol

**Result: yes.** The Canadian Space Agency's EODMS STAC catalogue returned RADARSAT-1 FRED scenes for the 1997–98 search area spanning Cebu and Bohol. The FRED records are raw signal segments; they are not ready-to-use, geocoded images. Treat these as candidate acquisitions for further processing.

## Search

- Catalogue: [EODMS STAC](https://www.eodms-sgdot.nrcan-rncan.gc.ca/search/collections)
- Collection: `Radarsat-1-FRED` (also checked `Radarsat-1-Raw`)
- Area: bbox `123.2,9.4,124.7,11.4` (WGS 84), covering Cebu and Bohol
- Dates: 1 Jan 1997 through 31 Dec 1998 (UTC)
- Search result: 42 FRED catalogue records; records sharing a segment ID represent parts of the same acquisition. The list below contains the 21 unique segment IDs whose catalog footprints intersect the project's Cebu/Bohol town polygons.
- Licence: the EODMS collection metadata identifies the catalogue as `OGL-Canada-2.0`.

## Candidate scenes

| Acquisition date (UTC) | EODMS segment ID | Dataset ID | Beam/mode |
| --- | --- | ---: | --- |
| 1997-01-14 | `28bc6b1a-d231-4338-927d-ead5586bbc29` | 244553 | SWB / ScanSAR Wide |
| 1997-02-22 | `e4d522a9-5038-4678-94d0-64e123f131c6` | 103948 | S6 / Standard |
| 1997-03-18 | `34d08dc3-1704-4f8a-b8d1-414ee0b411a2` | 105626 | S6 / Standard |
| 1997-07-28 | `94c492b4-c566-4ff7-9491-e141ac5c6fc2` | 113382 | S2 / Standard |
| 1998-02-14 | `7373d4d9-e958-40da-bf2b-3bd08cbf241c` | 288848 | S1 / Standard |
| 1998-02-19 | `6f518357-9d0a-4911-90f4-75316c74338e` | 125499 | S4 / Standard |
| 1998-02-19 | `460abc4c-04ea-4097-87e1-0403cb9c8a4f` | 125500 | S5 / Standard |
| 1998-04-06 | `df4c0954-5777-4e43-ad35-593469d7ba5e` | 129377 | S6 / Standard |
| 1998-04-08 | `fb55c0e3-707e-44d2-8c59-7b658212cc6d` | 129846 | F1 / Fine |
| 1998-04-13 | `34ceb1e3-4bb8-4459-944f-dbf761247054` | 129820 | S4 / Standard |
| 1998-05-02 | `1d778f06-a0d1-4ed2-94db-d3df10aa493f` | 131319 | F1 / Fine |
| 1998-05-09 | `674b1fd9-900a-43e9-acaa-855885f30717` | 308057 | F1 / Fine |
| 1998-05-24 | `7bcad096-83d5-480f-9108-b8735eb5ee4e` | 873229 | F3 / Fine |
| 1998-05-31 | `81e6819d-3c02-4ecb-860f-b7d07ae860b9` | 873287 | F1 / Fine |
| 1998-06-02 | `e65d66ff-8c18-4649-8969-87db08f89ff0` | 304940 | F2 / Fine |
| 1998-06-26 | `37719ae0-55e5-4968-997e-3189a0c45424` | 136665 | F3 / Fine |
| 1998-09-28 | `e30839c4-9027-4341-b323-4683e4f365c7` | 868920 | S5 / Standard |
| 1998-09-28 | `cf1c141e-66f8-427a-90b1-de99f99d467a` | 868921 | S5 / Standard |
| 1998-10-15 | `c4126921-e935-4e4a-bfa5-63a34b85d9ff` | 169802 | F2 / Fine |
| 1998-10-31 | `7584d55b-9cef-495c-af67-3219d7dfa260` | 170936 | W3 / Wide |
| 1998-12-05 | `d2e92bd6-88c6-4504-b488-b7014a48efa2` | 869125 | EH6 / Extended High |
| 1998-12-12 | `a0919b0b-d776-4463-bb86-da7c25aa4d88` | 869164 | S7 / Standard |

## Download / access

Use the [EODMS web search](https://www.eodms-sgdot.nrcan-rncan.gc.ca/search) with the same area and date filters, select a `Radarsat-1-FRED` result by segment/dataset ID, and add it to an EODMS order for delivery. The STAC item includes a `fredDataFile` S3 object URI; for example, dataset 244553 is `s3://radarsat-r1-raw-fred/gss/radarsat1/2021/6251/244553_01_20211107174952/RS0106250GSPB03P_19970114_212703_213153_SWB.10001`. The URI identifies an archive object; access and delivery follow EODMS catalogue terms. Process FRED data into an image before comparing it with the project's NISAR products.

## Limits

The match against town polygons uses the repository's `lgus.geojson`, whose features are marked as mock data. It is a screening result, not a boundary-accurate validation of every scene. Re-check candidate footprints against authoritative Cebu and Bohol boundaries before selecting an acquisition. This catalogue check does not download or process the scenes.

CSA describes RADARSAT-1 archive access through EODMS and AWS on its [data access page](https://www.csa-asc.gc.ca/eng/satellites/radarsat1/data-access.asp).
