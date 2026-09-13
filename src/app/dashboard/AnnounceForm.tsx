"use client";

import { announceAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";

export default function AnnounceForm() {
  return (
    <ActionForm action={announceAction} submit="post announcement">
      <div className="line">
        <div style={{ flex: 3 }}>
          <label>title</label>
          <input name="title" className="field" placeholder="what happened" required minLength={4} maxLength={140} />
        </div>
        <div style={{ flex: 0 }}>
          <label>level</label>
          <select name="level" className="field">
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="bad">critical</option>
          </select>
        </div>
      </div>
      <div>
        <label>body</label>
        <textarea name="body" className="field" rows={3} placeholder="give it something to say" required minLength={4} maxLength={4000} />
      </div>
    </ActionForm>
  );
}
