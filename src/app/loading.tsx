export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  );
} 