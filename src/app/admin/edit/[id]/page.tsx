'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvitationForm from '@/components/admin/InvitationForm';
import { Invitation, parseInvitation } from '@/lib/types';

export default function EditInvitationPage() {
  const params = useParams();
  const [invitation, setInvitation] = useState<ReturnType<typeof parseInvitation> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const res = await fetch('/api/admin/invitations');
        if (res.ok) {
          const data: Invitation[] = await res.json();
          const found = data.find(i => i.id === params.id);
          if (found) {
            setInvitation(parseInvitation(found));
          }
        }
      } catch {
        console.error('Error loading invitation');
      }
      setLoading(false);
    };
    loadInvitation();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-enkarta-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-playfair text-2xl text-gray-900 mb-2">Invitación no encontrada</h2>
          <a href="/admin" className="text-enkarta-gold hover:underline font-outfit">Volver al panel</a>
        </div>
      </div>
    );
  }

  return (
    <InvitationForm
      initialData={{
        id: invitation.id,
        slug: invitation.slug,
        template: invitation.template,
        type: invitation.type,
        names: invitation.names || '',
        event_date: invitation.event_date || '',
        ceremony_time: invitation.ceremony_time || '',
        ceremony_place: invitation.ceremony_place || '',
        ceremony_address: invitation.ceremony_address || '',
        reception_time: invitation.reception_time || '',
        reception_place: invitation.reception_place || '',
        reception_address: invitation.reception_address || '',
        guest_name: invitation.guest_name || '',
        guest_passes: invitation.guest_passes,
        message: invitation.message || '',
        dress_code: invitation.dress_code || '',
        no_kids: invitation.no_kids,
        parents_groom: invitation.parents_groom.length ? invitation.parents_groom : [''],
        parents_bride: invitation.parents_bride.length ? invitation.parents_bride : [''],
        sponsors: invitation.sponsors.length ? invitation.sponsors : [{ role: '', names: '' }],
        itinerary: invitation.itinerary.length ? invitation.itinerary : [{ time: '', label: '' }],
        gift_message: invitation.gift_message || '',
        bank_account: invitation.bank_account || '',
        cover_image_url: invitation.cover_image_url || '',
        gallery_url: invitation.gallery_url || '',
        color_primary: invitation.color_primary,
        color_secondary: invitation.color_secondary,
        color_accent: invitation.color_accent,
      }}
    />
  );
}
