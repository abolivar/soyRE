import { Injectable } from '@nestjs/common';
import type { DemoRequestTeamSize } from '@soyre/database';

export type NotifiableDemoRequest = {
  challenge: string | null;
  company: string;
  country: string;
  email: string;
  id: string;
  name: string;
  teamSize: DemoRequestTeamSize;
};

const teamSizeLabels: Record<DemoRequestTeamSize, string> = {
  ELEVEN_TO_TWENTY: '11-20',
  SIX_TO_TEN: '6-10',
  SOLO: 'Solo',
  TWENTY_ONE_PLUS: '21+',
  TWO_TO_FIVE: '2-5',
};

@Injectable()
export class DemoRequestNotifier {
  async notify(request: NotifiableDemoRequest) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.DEMO_FROM_EMAIL?.trim();
    const to = process.env.DEMO_NOTIFICATION_TO?.trim();

    if (!apiKey || !from || !to) {
      throw new Error('Resend notification is not configured.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from,
        reply_to: request.email,
        subject: `Nueva solicitud de demo · ${request.company}`,
        text: [
          `Nombre: ${request.name}`,
          `Correo: ${request.email}`,
          `Empresa: ${request.company}`,
          `País: ${request.country}`,
          `Tamaño del equipo: ${teamSizeLabels[request.teamSize]}`,
          `Reto operativo: ${request.challenge || 'No indicado'}`,
          `Solicitud: ${request.id}`,
        ].join('\n'),
        to: [to],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `demo-request-${request.id}`,
      },
      method: 'POST',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 500);
      throw new Error(
        `Resend returned ${response.status}: ${responseText || 'empty response'}`,
      );
    }
  }
}
