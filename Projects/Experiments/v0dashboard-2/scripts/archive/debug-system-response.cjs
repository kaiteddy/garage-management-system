// Debug what our system is actually receiving vs what we expect
async function debugSystemResponse() {
  console.log('🔍 Debugging system response parsing...');
  
  // Use the exact same configuration as our system
  const endpoint = 'https://www.sws-solutions.co.uk/API-V4/TechnicalData_Query.php';
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic R2FyYWdlQXNzaXN0YW50R0E0OkhHdTc2WFQ1c0kxTDBYZ0g4MTZYNzJGMzRSOTkxWmRfNGc=',
    'User-Agent': 'Garage Assistant/4.0'
  };

  const body = new URLSearchParams({
    ACTION: 'GET_INITIAL_SUBJECTS',
    REPID: '',
    NODEID: '',
    query: '',
    VRM: 'S31STK',
    APIKEY: 'C94A0F3F12E88DB916C008B069E34F65'
  });

  try {
    console.log('📡 Making request...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    const text = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📄 Response length:', text.length);

    let swsData;
    try {
      swsData = JSON.parse(text);
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError.message);
      console.log('Raw response:', text);
      return;
    }

    console.log('✅ JSON parsed successfully');

    // Debug the exact parsing logic our system uses
    console.log('\n🔍 Debugging system parsing logic:');
    
    // Check for raw response (error case)
    if (swsData?.raw) {
      console.log('❌ System would detect raw response:', swsData.raw.substring(0, 200));
      return;
    } else {
      console.log('✅ No raw response detected');
    }

    // Check for the "0" key and TechnicalData
    console.log('📋 Response structure:');
    console.log('  - Top level keys:', Object.keys(swsData || {}));
    
    const carData = swsData?.["0"]?.TechnicalData;
    console.log('  - swsData["0"] exists:', !!swsData?.["0"]);
    console.log('  - TechnicalData exists:', !!carData);
    
    if (carData) {
      console.log('  - TechnicalData keys:', Object.keys(carData));
      
      const imageUrl = carData?.modelPictureMimeDataName;
      console.log('  - modelPictureMimeDataName:', imageUrl);
      console.log('  - imageUrl exists:', !!imageUrl);
      console.log('  - ends with .svgz:', imageUrl?.endsWith('.svgz'));
      
      if (!imageUrl || !imageUrl.endsWith('.svgz')) {
        console.log('❌ System would say: No SVGZ image found');
        console.log('  - Reason: imageUrl =', imageUrl);
      } else {
        console.log('✅ System would find SVGZ image:', imageUrl);
      }
    } else {
      console.log('❌ System would say: No TechnicalData found');
    }

    // Show the full response for comparison
    console.log('\n📋 Full response structure:');
    console.log(JSON.stringify(swsData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugSystemResponse();
