import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <h1 class="text-4xl font-bold text-blue-600 mb-4">Hello Vite + Tailwind!</h1>
    <p class="text-lg text-gray-700">Edit <code class="bg-gray-200 p-1 rounded">src/main.js</code> to get started.</p>
    <div class="mt-8 p-6 bg-white rounded-xl shadow-lg flex items-center space-x-4">
        <div class="shrink-0">
            <div class="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">V</div>
        </div>
        <div>
            <div class="text-xl font-medium text-black">Vite + Tailwind CSS</div>
            <p class="text-slate-500">You have a new message!</p>
        </div>
    </div>
  </div>
`
