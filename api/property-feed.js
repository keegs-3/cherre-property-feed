const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async function handler(req, res) {
  const headers = {
    'Authorization': 'Bearer YXBpLWNsaWVudC0xMzg0MWM0MC1hNWNlLTQwZjYtOGM5Ny0wYTIzMmU4ZGU0ZWNAY2hlcnJlLmNvbTpOdUNCJEtYcSVlV3lrSSVnUVY3eTlNczNNbWRzZ0hJUlUwISNCSkM0aFVPWGUzcDI3TjRhRUNac1gyOVFodXZO',
    'Content-Type': 'application/json',
  };

  const endpoint = 'https://graphql.cherre.com/graphql';

  const fetchCherre = async (query) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });
    const { data } = await response.json();
    return data;
  };

  try {
    const [buildingsData, unitsData, avmData] = await Promise.all([
      fetchCherre(`{
        usa_building_v2(limit: 10) {
          county_building_id
          address
          city
          state
        }
      }`),
      fetchCherre(`{
        usa_unit_v2(limit: 10) {
          cherre_usa_unit_pk
          address
          unit_number_prefix
          unit_number
          city
        }
      }`),
      fetchCherre(`{
        usa_avm_v2(limit: 10) {
          cherre_usa_avm_pk
          tax_assessor_id
          estimated_value_amount
          estimated_min_value_amount
          estimated_max_value_amount
        }
      }`),
    ]);

    const units = unitsData.usa_unit_v2 || [];
    const avms = avmData.usa_avm_v2 || [];

    const merged = (buildingsData.usa_building_v2 || []).map((building) => {
      const { address, city } = building;
      const relatedUnits = units.filter(
        (u) => u.address === address && u.city === city
      );
      const relatedAvm = avms.find(
        (a) => a.estimated_value_amount && a.estimated_value_amount > 0
      );
      return {
        ...building,
        units: relatedUnits,
        avm: relatedAvm || null,
      };
    });

    res.status(200).json({ properties: merged });
  } catch (err) {
    console.error('Error fetching Cherre data:', err);
    res.status(500).json({ error: 'Failed to fetch property data.' });
  }
};
