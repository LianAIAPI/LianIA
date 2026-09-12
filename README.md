# Lian AI 1.5

Lian AI 1.5 usa una arquitectura híbrida:

- **Lian Core 1.5:** motor propio local para conversación, memoria, razonamiento básico y recuperación de conocimiento. El chat NO necesita GPT-5.6 Luna ni otra API de chat de OpenAI.
- **Lian Video AI 1.5:** generador de vídeo propio basado en escenas procedurales y FFmpeg. No usa Sora. Genera MP4 directamente en el servidor y deja una base para añadir sprites, imágenes, audio, partículas y plantillas de Lian Parkur.
- **Imágenes:** se conserva `gpt-image-2`.
- **Código:** se conserva `/lian-ai/code` con Codex.
- **Documentos:** TXT, MD, JSON, HTML y DOCX.
- **Memoria:** por `userId` en `memories.json`.

## Endpoints

- `GET /health`
- `POST /lian-ai`
- `POST /lian-ai/image`
- `POST /lian-ai/video`
- `GET /lian-ai/video/:videoId`
- `GET /lian-ai/video/:videoId/content`
- `POST /lian-ai/code`
- `POST /lian-ai/document`
- `POST /lian-ai/remember`
- `DELETE /lian-ai/memory`

## Importante

Lian Core es realmente independiente de OpenAI para el chat, pero no pretende ser un modelo fundacional del nivel de GPT. Su capacidad aumenta añadiendo conocimiento, reglas, herramientas y, en el futuro, un modelo propio entrenado/ejecutado por Lian Studios.

Lian Video AI 1.5 ya genera archivos MP4 reales sin Sora, pero esta primera versión es un motor procedural, no un modelo neuronal de text-to-video. Es una base segura para evolucionarlo a un modelo propio de vídeo cuando tengas infraestructura para entrenarlo o ejecutarlo.
