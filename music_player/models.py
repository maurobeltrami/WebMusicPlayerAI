from django.db import models

class Track(models.Model):
    """Modello per la memorizzazione dei metadati musicali e dei percorsi file/cloud."""
    title = models.CharField(max_length=255, db_index=True)
    artist = models.CharField(max_length=255, db_index=True)
    album = models.CharField(max_length=255, db_index=True)
    file_path = models.CharField(max_length=1024, unique=True, help_text="Percorso relativo per file locali o ID per Google Drive")
    cover_url = models.CharField(max_length=1024, blank=True, null=True)
    
    # Enum per distinguere le sorgenti
    SOURCE_CHOICES = [
        ('local', 'Local File'),
        ('gdrive', 'Google Drive'),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='local')
    
    # Opzionale per estensioni future su Drive
    drive_file_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['artist', 'album', 'title']

    def __str__(self):
        return f"{self.artist} - {self.title}"
