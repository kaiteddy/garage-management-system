'use client'

export default function TestImagePage() {
  const imageUrl = "https://vehicleimages.ukvehicledata.co.uk/s3/95B34DF231C26B5D271C831DD725FD994D613146920E86F6384F08C8C0657BC1EB549E7FC5A35A008E74260E08D91AD0A7FF79F027361DDDFD4BAD9EDC712071DD28D17AFBC646C591CD277F471504639965D5170836E200291FE94845930C63"
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">VDG Image Test</h1>
      <div className="max-w-md">
        <img 
          src={imageUrl}
          alt="Test VDG Vehicle Image"
          className="w-full h-auto rounded-lg border"
          onLoad={() => console.log('✅ Image loaded successfully')}
          onError={(e) => console.error('❌ Image failed to load:', e)}
        />
        <p className="text-sm text-gray-600 mt-2">
          Testing VDG image URL directly
        </p>
      </div>
    </div>
  )
}
