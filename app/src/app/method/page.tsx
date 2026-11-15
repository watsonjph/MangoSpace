import type { Metadata } from "next";
import MapLink from "../MapLink";
import lgus from "../../../public/data/lgus.json";
import outlooks from "../../../public/data/outlook.json";

export const metadata: Metadata = { title: "Method · Hubas" };

export default function MethodPage() {
  const hasSoilWater = lgus.some((town) => town.soilMoisture.some((value) => value !== null));

  return (
    <main className="method-page">
      <p className="eyebrow">Cebu + Bohol · Data and limits</p>
      <h1>Measured, not forecast</h1>
      <p>Hubas shows satellite measurements of soil water and explains what they can tell us.
        The app makes no forecast of its own. An official PAGASA outlook is separate from the measurements.</p>
      <p className="notice">The NISAR soil water data is provisional. The rank is a preview,
        not a drought risk score. {hasSoilWater
          ? "Read the coverage and limits before comparing towns."
          : "Soil water measurements and ranks have not been loaded in this build. Gray towns have no soil water data."}</p>

      <section aria-labelledby="soil-method">
        <h2 id="soil-method">Soil water and coverage</h2>
        <p>We use all valid NISAR soil water readings. NISAR marks most of them as not recommended.
          The NISAR soil water data is provisional. Thus, the rank is a preview.</p>
        <p>The processing method combines all NISAR passes in each 12-day window before calculating
          the average for each town. One pass shows mostly Cebu; another shows mostly Bohol.</p>
        <p>Soil water is measured in m³/m³: cubic metres of water per cubic metre of soil.
          The map colour scale runs from 0.10 (drier) to 0.45 (wetter). Gray means less than half the pixels have data.</p>
        <p>“Pixels with data” in the town panel means the share of a town with a valid reading in that window.
          It is coverage, not an accuracy score. A town is “not ranked” if less than half of it has data.</p>
        <p data-testid="smap-check">We compared the NISAR soil water with NASA’s SMAP satellite for the same
          12-day windows over Cebu and Bohol. NISAR is lower than SMAP by 0.07 m³/m³ on average, and the
          typical difference is 0.11 m³/m³. The two agree on when the islands were wetter or drier
          (correlation 0.70 over the 11 windows), but they do not agree on which places are drier in one window.
          A SMAP cell is 9 km wide and can include the sea, so it is a check and not the truth.</p>
      </section>

      <section aria-labelledby="rank-method">
        <h2 id="rank-method">How the rank preview works</h2>
        <p>The rank gives equal weight to three parts: how dry a town is now, how much its soil water
          fell over the three windows before, and how many people live there (on a logarithm scale).
          Population comes from the 2024 census.</p>
        <p>&ldquo;Now&rdquo; is the latest window in which the most towns have data, shown next to the rank
          in the town panel. The rank does not change with the slider. In the current data every town became
          wetter from September to October, so a high drying speed means &ldquo;became wetter the least&rdquo;.</p>
        <p>The stability check doubles the weight of each part, one at a time. A town that remains
          in the top 10 in every check is called stable. These are places to look at first,
          not predictions of drought or a measure of risk.</p>
        <p data-testid="rank-smap">SMAP does not confirm which towns are drier in the windows the rank uses
          (correlation between places −0.06 on 7 October and −0.41 on 1 September). Read the order as a list
          of towns to check, not as a result.</p>
      </section>

      <section aria-labelledby="radar-limits">
        <h2 id="radar-limits">Radar measurements and their limits</h2>
        <p>The supplied Malinao Dam images use NISAR GCOV HH and HV radar measurements on track 003.
          Water area is calculated from dark HH pixels inside a reservoir outline, using a −10 dB
          threshold after speckle reduction, then multiplying the count by the pixel area.</p>
        <p>A smaller water area can have several causes, including less rain, more water use,
          or dam work. The radar images alone do not establish the cause. In 2026 the area stayed
          within 8% of its mean; the small dip on 18 September is larger than the noise of the method, but its cause is not known.</p>
        <p>Compare dates from the same satellite track for each target. Different radar viewing angles
          can change the image. NISAR and Sentinel-1 can give different water areas in km²,
          so compare changes between sensors as percentages rather than absolute areas.</p>
        <p>Rice sample measurements cover
          small field parcels, not whole towns, and do not establish crop identity or growth stage.</p>
        <p>In the dam view, dashed lines mean:
          “This is what happened before. It is not a forecast.”</p>
      </section>

      <section aria-labelledby="sources">
        <h2 id="sources">Data sources and licences</h2>
        <ul className="source-list">
          <li><strong>NISAR SME2 soil water and GCOV radar files.</strong> NASA and ISRO,
            distributed by the Alaska Satellite Facility (ASF). Both collections are provisional.
            SME2 is the source for the soil water method; GCOV supplies the packaged dam and rice images.
            Science data is freely available under NASA’s open data policy.
            {" "}<a href="https://nisar-docs.asf.alaska.edu/">NISAR Data User Guide and data policy</a>.</li>
          <li><strong>GPM IMERG rain.</strong> NASA GES DISC, GPM_3IMERGDL version 07 (daily Late Run).
            The dam and rice charts show the rain total for the 12 days before each radar date.
            Data is freely available; acknowledge NASA and the dataset producers.
            {" "}<a href="https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary">GPM IMERG dataset</a> ·
            {" "}<a href="https://gpm.nasa.gov/data/policy">GPM data policy and citation</a>.</li>
          <li><strong>Copernicus Sentinel-1 radar.</strong> European Union Copernicus, processed through
            ASF HyP3 and OPERA RTC-S1. The dam view uses Sentinel-1 for the 2015–16 and 2023–24 history.
            Sentinel-1 rice comparison images are also included in the packaged data.
            Contains modified Copernicus Sentinel data 2015–2016, 2023–2024 and 2026.
            Access and use are free, full and open under the Copernicus Sentinel legal notice.
            {" "}<a href="https://dataspace.copernicus.eu/explore-data/data-collections/sentinel-data/sentinel-1">Sentinel-1 dataset</a> ·
            {" "}<a href="https://cds.climate.copernicus.eu/licences/ec-sentinel">Copernicus Sentinel legal notice</a> ·
            {" "}<a href="https://hyp3-docs.asf.alaska.edu/">ASF HyP3 processing</a> ·
            {" "}<a href="https://www.jpl.nasa.gov/go/opera/products/rtc-product/">OPERA RTC-S1 processing</a>.</li>
          <li><strong>SMAP soil water check.</strong> NASA NSIDC DAAC, SPL3SMP_E enhanced daily
            soil water on a 9 km grid. Used for the NISAR comparison above, not to confirm the town rank.
            Data is free to access; cite the dataset and the version used.
            {" "}<a href="https://nsidc.org/data/spl3smp_e">SMAP dataset and citation</a> ·
            {" "}<a href="https://nsidc.org/data/data-programs/nsidc-daac/citing-nsidc-daac">NSIDC citation policy</a>.</li>
          <li><strong>Town borders.</strong> NAMRIA and the Philippine Statistics Authority (PSA),
            through OCHA’s COD-AB. Converted by James Faeldon’s philippines-json-maps v1.1.1,
            with PSGC 3Q 2026 codes, simplified to 1% of vertices and rounded to five decimal places.
            Underlying boundaries: <a href="https://creativecommons.org/licenses/by/3.0/igo/">CC BY 3.0 IGO</a>;
            conversion: <a href="https://github.com/faeldon/philippines-json-maps/blob/v1.1.1/LICENSE">MIT</a>.
            {" "}<a href="https://data.humdata.org/dataset/cod-ab-phl">Boundary source</a> ·
            {" "}<a href="https://github.com/faeldon/philippines-json-maps/tree/v1.1.1">Converted maps</a>.</li>
          <li><strong>Population and town codes.</strong> PSA, 2024 Census of Population (POPCEN 2024),
            in the PSGC 3Q 2026 table. This build covers {lgus.length} towns and cities in Cebu and Bohol.
            Government statistics; credit PSA as the source.
            {" "}<a href="https://psa.gov.ph/classification/psgc">PSA publication</a> ·
            {" "}<a href="https://github.com/faeldon/philippines-psgc-shapefiles/blob/v1.0.1/data/psgc/2026-3q/psgc.csv">Pinned population table</a>.</li>
          <li><strong>PAGASA rain outlook.</strong> DOST-PAGASA. Public-domain government advisory,
            unless otherwise stated; credit PAGASA.
            {outlooks.map((outlook) => <span key={outlook.province}> {outlook.province}: {outlook.advisory}, issued {outlook.issued}.</span>)}
            {" "}<a href="https://www.pagasa.dost.gov.ph/climate/el-nino-la-nina/advisories">Official advisories</a>.</li>
          <li><strong>Base map.</strong> <a href="https://openfreemap.org/">OpenFreeMap</a>,
            <a href="https://openmaptiles.org/"> OpenMapTiles</a>, and © OpenStreetMap contributors.
            OpenStreetMap data is under the <a href="https://www.openstreetmap.org/copyright">Open Database Licence (ODbL)</a>;
            OpenMapTiles cartography is <a href="https://github.com/openmaptiles/positron-gl-style/blob/master/LICENSE.md">CC BY 3.0</a>.
            The map also shows these credits.</li>
        </ul>
      </section>
      <p><MapLink href="/">Back to soil water</MapLink></p>
    </main>
  );
}
