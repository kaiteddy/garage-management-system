import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Calendar, Car, Gauge, Fuel, CalendarCheck, CalendarX, AlertTriangle } from 'lucide-react';

interface VehicleDetailsProps {
  vehicle: {
    registration: string;
    make: string;
    model: string;
    year?: number;
    colour?: string;
    fuelType?: string;
    motStatus?: string;
    motExpiry?: string;
    taxStatus?: string;
    taxDueDate?: string;
    engineCapacity?: number;
    co2Emissions?: number;
    firstUsedDate?: string;
    typeApproval?: string;
    wheelplan?: string;
    motTests?: Array<{
      completedDate: string;
      testResult: string;
      expiryDate?: string;
      odometerValue: string;
      odometerUnit: string;
      motTestNumber: string;
      rfrAndComments: Array<{
        text: string;
        type: string;
        dangerous: boolean;
      }>;
    }>;
  };
}

export function VehicleDetails({ vehicle }: VehicleDetailsProps) {
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge color
  const getStatusBadge = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('valid') || statusLower.includes('passed') || statusLower.includes('taxed')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('expired') || statusLower.includes('failed')) {
      return 'bg-red-100 text-red-800';
    } else if (statusLower.includes('due')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Get most recent MOT test
  const latestMot = vehicle.motTests?.[0];
  
  return (
    <div className="space-y-6">
      {/* Vehicle Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Registration</p>
              <p className="font-medium">{vehicle.registration}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Make</p>
              <p className="font-medium">{vehicle.make || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{vehicle.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium">{vehicle.year || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Colour</p>
              <p className="font-medium">{vehicle.colour || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fuel Type</p>
              <p className="font-medium">{vehicle.fuelType || 'N/A'}</p>
            </div>
            {vehicle.engineCapacity && (
              <div>
                <p className="text-sm text-muted-foreground">Engine</p>
                <p className="font-medium">{vehicle.engineCapacity} cc</p>
              </div>
            )}
            {vehicle.co2Emissions && (
              <div>
                <p className="text-sm text-muted-foreground">CO₂ Emissions</p>
                <p className="font-medium">{vehicle.co2Emissions} g/km</p>
              </div>
            )}
            {vehicle.firstUsedDate && (
              <div>
                <p className="text-sm text-muted-foreground">First Registered</p>
                <p className="font-medium">{formatDate(vehicle.firstUsedDate)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MOT Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              MOT Status
            </CardTitle>
            <Badge className={getStatusBadge(vehicle.motStatus)}>
              {vehicle.motStatus || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Expiry Date</p>
              <p className="font-medium">
                {vehicle.motExpiry ? formatDate(vehicle.motExpiry) : 'N/A'}
              </p>
            </div>
            {latestMot && (
              <div>
                <p className="text-sm text-muted-foreground">Last Test Date</p>
                <p className="font-medium">{formatDate(latestMot.completedDate)}</p>
              </div>
            )}
            {latestMot?.odometerValue && (
              <div>
                <p className="text-sm text-muted-foreground">Mileage at Last Test</p>
                <p className="font-medium flex items-center gap-1">
                  <Gauge className="h-4 w-4" />
                  {latestMot.odometerValue} {latestMot.odometerUnit}
                </p>
              </div>
            )}
            {latestMot?.motTestNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Test Number</p>
                <p className="font-mono text-sm">{latestMot.motTestNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tax Status
            </CardTitle>
            <Badge className={getStatusBadge(vehicle.taxStatus)}>
              {vehicle.taxStatus || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tax Due Date</p>
              <p className="font-medium">
                {vehicle.taxDueDate ? formatDate(vehicle.taxDueDate) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MOT History */}
      {vehicle.motTests && vehicle.motTests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              MOT History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {vehicle.motTests.map((test, index) => (
                <div key={index} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {formatDate(test.completedDate)}
                        <span className="ml-2">
                          <Badge 
                            variant={test.testResult === 'PASSED' ? 'default' : 'destructive'}
                            className="ml-2"
                          >
                            {test.testResult}
                          </Badge>
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {test.odometerValue} {test.odometerUnit}
                      </p>
                      {test.expiryDate && (
                        <p className="text-sm">
                          Expiry: {formatDate(test.expiryDate)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Test #: {test.motTestNumber}
                      </p>
                    </div>
                  </div>

                  {test.rfrAndComments && test.rfrAndComments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {test.rfrAndComments.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`text-sm p-2 rounded ${
                            item.dangerous 
                              ? 'bg-red-50 text-red-800 border-l-2 border-red-500' 
                              : item.type === 'ADVISORY' 
                                ? 'bg-yellow-50 text-yellow-800 border-l-2 border-yellow-500' 
                                : 'bg-gray-50 text-gray-800 border-l-2 border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {item.dangerous ? (
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                            ) : item.type === 'ADVISORY' ? (
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                            ) : (
                              <span className="w-4"></span>
                            )}
                            <span>
                              <span className="font-medium">{item.type}:</span> {item.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
