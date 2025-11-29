'use client';

import MessageForm from '../../../../components/MessageForm';

export default function Page() {
  return (
    <div className="p-8">
      <MessageForm redirectPath="/admin/super/messages" />
    </div>
  );
}

