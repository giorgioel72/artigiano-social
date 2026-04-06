const API_URL = 'https://artigiano-social-api.onrender.com/api';
let uploadedImages = [];

window.addEventListener('load', function() {
    console.log('🚀 Avvio...');
    
    const fileInput = document.getElementById('imageInput');
    const uploadBtn = document.querySelector('.btn-upload');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const imagesJson = document.getElementById('imagesJson');
    const form = document.getElementById('addWorkForm');
    const title = document.getElementById('title');
    const desc = document.getElementById('description');
    const cat = document.getElementById('category');
    const luogo = document.getElementById('luogo');
    const status = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!fileInput || !uploadBtn || !form) {
        console.error('❌ Elementi mancanti');
        return;
    }
    
    // Upload button
    uploadBtn.onclick = function(e) {
        e.preventDefault();
        console.log('📂 Click su upload');
        fileInput.click();
    };
    
    // File selection
    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('📸 File selezionato:', file.name);
        
        const formData = new FormData();
        formData.append('images', file);
        
        const token = localStorage.getItem('token');
        
        try {
            console.log('📡 Invio richiesta...');
            
            const response = await fetch(`${API_URL}/upload/images`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            console.log('📡 Status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Upload OK:', result);
            
            uploadedImages = result.images;
            
            // Preview
            if (previewContainer) {
                previewContainer.innerHTML = `<div class="image-preview">
                    <img src="${result.images[0].imageUrl}" style="width:100px; height:100px; object-fit:cover;">
                </div>`;
            }
            
            if (imagesJson) {
                imagesJson.value = JSON.stringify(result.images.map(img => img.imageUrl));
            }
            
            alert('✅ Immagine caricata con successo!');
            
        } catch (error) {
            console.error('❌ Errore:', error);
            alert('❌ Errore upload: ' + error.message);
        } finally {
            fileInput.value = '';
        }
    };
    
    // Submit form
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        console.log('📤 Submit form');
        
        const workData = {
            title: title.value,
            description: desc.value,
            category: cat.value,
            luogo: luogo.value || '',
            status: status.value,
            images: uploadedImages.map(img => img.imageUrl)
        };
        
        if (!workData.title || !workData.description || !workData.category) {
            alert('Compila tutti i campi obbligatori');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Pubblicazione...';
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/works`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(workData)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Errore');
            
            console.log('✅ Lavoro pubblicato:', result);
            alert('✅ Lavoro pubblicato con successo!');
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('❌ Errore submit:', error);
            alert('❌ Errore: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pubblica lavoro';
        }
    };
    
    console.log('✅ Setup completato');
});
