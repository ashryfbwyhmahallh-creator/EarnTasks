"use client";
export function WhatsAppButton() {
  const number = "22233519640";
  const href = `https://wa.me/${number}?text=${encodeURIComponent("Hi EarnTasks support, I need help.")}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with support on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl shadow-glow transition hover:scale-105">
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.5 4.1 1.6 5.9L4 29l8.3-1.6c1.7 1 3.6 1.5 5.6 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7.7.7-3.6-.2-.4c-1-1.5-1.5-3.3-1.5-5.1 0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-9.9 10zm5.6-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.7-1.7-2-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3z" />
      </svg>
    </a>
  );
}