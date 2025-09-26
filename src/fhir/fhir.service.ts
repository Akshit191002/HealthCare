import { Injectable, Logger } from '@nestjs/common';
// import axios from 'axios';

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);
  // private readonly baseUrl = 'https://example-fhir-server.com'; // replace with real FHIR server
  // private readonly token = process.env.FHIR_API_TOKEN;

  // async createPatient(patient: { firstName: string; lastName: string; dob: string; gender: string }) {
  //   const fhirPatient = {
  //     resourceType: 'Patient',
  //     name: [{ given: [patient.firstName], family: patient.lastName }],
  //     birthDate: patient.dob,
  //     gender: patient.gender,
  //   };

  //   const response = await axios.post(`${this.baseUrl}/Patient`, fhirPatient, {
  //     headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/fhir+json' },
  //   });

  //   this.logger.log(`FHIR patient created with ID: ${response.data.id}`);
  //   return response.data.id;
  // }

  async createPatient(patient: { firstName: string; lastName: string; dob: string; gender: string }) {
    // Return a fake FHIR patient object
    const mockFhirId = 'mock-fhir-id-123';
    this.logger.log(`FHIR patient created (mock) with ID: ${mockFhirId}`);
    return mockFhirId;
  }

  async createPractitioner(doctor: { firstName: string; lastName: string; dob: string; gender: string; specialization: string; licenseNumber: string }) {
    const mockFhirId = 'mock-fhir-practitioner-id-789';
    this.logger.log(`FHIR practitioner created (mock) with ID: ${mockFhirId}`);
    return mockFhirId;
  }

  async createAppointment(data: { patientFhirId: string; doctorFhirId: string; date: string; notes?: string }) {
    const mockId = 'mock-fhir-appointment-123';
    this.logger.log(`FHIR appointment created (mock) with ID: ${mockId}`);
    return mockId;
  }


  // async createObservation(patientFhirId: string, observation: { code: string; value: number; unit: string }) {
  //   const fhirObservation = {
  //     resourceType: 'Observation',
  //     status: 'final',
  //     code: { text: observation.code },
  //     subject: { reference: `Patient/${patientFhirId}` },
  //     valueQuantity: { value: observation.value, unit: observation.unit },
  //   };

  //   const response = await axios.post(`${this.baseUrl}/Observation`, fhirObservation, {
  //     headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/fhir+json' },
  //   });

  //   this.logger.log(`FHIR observation created with ID: ${response.data.id}`);
  //   return response.data.id;
  // }

  async createObservation(
    patientFhirId: string,
    observation: { code: string; value: number; unit: string },
  ) {
    const mockObservationId = 'mock-observation-id-456';
    this.logger.log(`FHIR observation created (mock) with ID: ${mockObservationId}`);
    return mockObservationId;
  }
}
