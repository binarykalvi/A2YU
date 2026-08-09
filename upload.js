const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function uploadVideo() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Error: Missing YouTube API credentials in environment variables.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  const downloadsDir = path.join(__dirname, 'downloads');
  const files = fs.readdirSync(downloadsDir);
  const videoFile = files.find(file => /\.(mp4|mkv|mov|webm|avi)$/i.test(file));

  if (!videoFile) {
    console.error('Error: No valid video file found in downloads/ folder.');
    process.exit(1);
  }

  const filePath = path.join(downloadsDir, videoFile);
  const fileSize = fs.statSync(filePath).size;

  console.log(`Starting upload: ${videoFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  const title = process.env.VIDEO_TITLE || 'Automated Video Upload';
  const description = process.env.VIDEO_DESCRIPTION || 'Uploaded via Binary Kalvi Automation Engine.';
  const visibility = process.env.VIDEO_VISIBILITY || 'unlisted';

  try {
    const response = await youtube.videos.insert(
      {
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title: title,
            description: description,
            categoryId: '27',
          },
          status: {
            privacyStatus: visibility,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(filePath),
        },
      },
      {
        onUploadProgress: (evt) => {
          const progress = ((evt.bytesRead / fileSize) * 100).toFixed(2);
          console.log(`Uploading... ${progress}%`);
        },
      }
    );

    console.log(`Upload Complete! Video ID: ${response.data.id}`);
    console.log(`Watch Link: https://youtu.be/${response.data.id}`);
  } catch (error) {
    console.error('YouTube Upload Failed:', error.message);
    process.exit(1);
  }
}

uploadVideo();
