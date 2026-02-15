import { Platform } from 'react-native';
import AppleHealthKit from 'react-native-health';

const { HealthKit } = AppleHealthKit;

class HealthKitService {
  constructor() {
    this.permissions = {
      permissions: {
        read: [
          HealthKit.Constants.Permissions.StepCount,
          HealthKit.Constants.Permissions.DistanceWalkingRunning,
          HealthKit.Constants.Permissions.ActiveEnergyBurned,
          HealthKit.Constants.Permissions.HeartRate,
          HealthKit.Constants.Permissions.SleepAnalysis,
          HealthKit.Constants.Permissions.Weight,
          HealthKit.Constants.Permissions.Workout,
        ],
        write: [],
      },
    };
  }

  async initialize() {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit only available on iOS');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(this.permissions, (err) => {
        if (err) {
          console.log('Error initializing HealthKit:', err);
          resolve(false);
          return;
        }
        console.log('HealthKit initialized successfully');
        resolve(true);
      });
    });
  }

  async getHealthDataForDate(date) {
    const dateString = date.toISOString();
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
      // Get steps
      const steps = await this.getSteps(dateString, nextDay.toISOString());
      
      // Get active energy
      const energy = await this.getActiveEnergy(dateString, nextDay.toISOString());
      
      // Get heart rate (resting)
      const heartRate = await this.getRestingHeartRate(dateString, nextDay.toISOString());
      
      // Get weight
      const weight = await this.getWeight();
      
      // Get sleep
      const sleep = await this.getSleepAnalysis(dateString, nextDay.toISOString());

      return {
        schritte: steps,
        aktivitaetsenergie: Math.round(energy),
        herzfrequenz_ruhe: heartRate,
        herzfrequenz_avg: heartRate,
        gewicht: weight,
        schlaf_stunden: sleep.hours,
        schlaf_index: sleep.quality,
        training_minuten: 0, // Would need workout data
      };
    } catch (error) {
      console.error('Error fetching health data:', error);
      return null;
    }
  }

  getSteps(startDate, endDate) {
    return new Promise((resolve) => {
      const options = {
        date: startDate,
        includeManuallyAdded: true,
      };

      AppleHealthKit.getStepCount(options, (err, results) => {
        if (err) {
          console.log('Error getting steps:', err);
          resolve(0);
          return;
        }
        resolve(results.value || 0);
      });
    });
  }

  getActiveEnergy(startDate, endDate) {
    return new Promise((resolve) => {
      const options = {
        startDate,
        endDate,
        type: HealthKit.Constants.Types.ActiveEnergyBurned,
      };

      AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
        if (err) {
          console.log('Error getting energy:', err);
          resolve(0);
          return;
        }
        // Convert kcal to integer
        resolve(Math.round(results[0]?.value || 0));
      });
    });
  }

  getRestingHeartRate(startDate, endDate) {
    return new Promise((resolve) => {
      const options = {
        unit: 'bpm',
        startDate,
        endDate,
        ascending: false,
        limit: 10,
      };

      // Try to get resting heart rate first
      AppleHealthKit.getRestingHeartRate(options, (err, results) => {
        if (err || !results || results.length === 0) {
          // Fallback to regular heart rate
          AppleHealthKit.getHeartRateSamples(options, (err2, hrResults) => {
            if (err2 || !hrResults || hrResults.length === 0) {
              resolve(0);
              return;
            }
            // Take the lowest as approximation for resting
            const values = hrResults.map(r => r.value);
            resolve(Math.round(Math.min(...values)));
          });
          return;
        }
        resolve(Math.round(results[0].value));
      });
    });
  }

  getWeight() {
    return new Promise((resolve) => {
      const options = {
        unit: 'kg',
      };

      AppleHealthKit.getLatestWeight(options, (err, results) => {
        if (err) {
          console.log('Error getting weight:', err);
          resolve(0);
          return;
        }
        resolve(parseFloat(results.value.toFixed(1)));
      });
    });
  }

  getSleepAnalysis(startDate, endDate) {
    return new Promise((resolve) => {
      const options = {
        startDate,
        endDate,
      };

      AppleHealthKit.getSleepSamples(options, (err, results) => {
        if (err) {
          console.log('Error getting sleep:', err);
          resolve({ hours: 0, quality: 0 });
          return;
        }

        if (!results || results.length === 0) {
          resolve({ hours: 0, quality: 0 });
          return;
        }

        // Calculate total sleep hours
        let totalMinutes = 0;
        results.forEach((sample) => {
          if (sample.value === 'INBED' || sample.value === 'ASLEEP') {
            const start = new Date(sample.startDate);
            const end = new Date(sample.endDate);
            const minutes = (end - start) / (1000 * 60);
            totalMinutes += minutes;
          }
        });

        const hours = parseFloat((totalMinutes / 60).toFixed(1));
        
        // Estimate sleep quality based on duration
        // This is a simple heuristic - ideally you'd use sleep stages
        let quality = 0;
        if (hours >= 7 && hours <= 9) quality = 90;
        else if (hours >= 6 && hours < 7) quality = 75;
        else if (hours > 9) quality = 70;
        else quality = 50;

        resolve({ hours, quality });
      });
    });
  }

  // Background sync setup
  async configureBackgroundFetch(callback) {
    // This requires react-native-background-fetch
    // Implementation would go here
    // For now, we return a mock status
    return 'available';
  }
}

export default new HealthKitService();