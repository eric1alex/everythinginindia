export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please enter a valid email address'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const downloadUrl = import.meta.env.WALLPAPER_DOWNLOAD_URL;
    const audienceId = import.meta.env.RESEND_AUDIENCE_ID;

    // Save contact to Resend audience
    try {
      await resend.contacts.create({
        audienceId: audienceId,
        email: email,
        unsubscribed: false,
      });
    } catch (contactError) {
      // Contact might already exist, continue anyway
      console.log('Contact creation note:', contactError);
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Where In India <hello@whereinindia.online>',
      to: email,
      subject: 'Your India 4K Wallpapers Are Here! 📱',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.whereinindia.online/flag.png" alt="Where In India" style="width: 40px; height: auto;">
          </div>
          
          <h1 style="font-size: 24px; margin-bottom: 20px;">Your wallpapers are ready! 🎉</h1>
          
          <p>Thanks for downloading the official India 4K Wallpaper Pack. These are perfectly cropped for iPhone and Android lock screens.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background-color: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              📱 Download Wallpapers
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e2e2; margin: 30px 0;">
          
          <p style="background-color: #f4f4f4; padding: 16px; border-radius: 8px;">
            <strong>🎁 Special Offer:</strong> Use code <strong style="color: #1a1a1a;">WALLPAPER20</strong> for 20% off our physical postcards. Same stunning photos, printed on premium A6 cards.
          </p>
          
          <p style="margin-top: 30px;">
            <a href="https://www.whereinindia.online/shop" style="color: #1a1a1a;">Browse Postcards →</a>
          </p>
          
          <p style="margin-top: 40px; color: #888; font-size: 14px;">
            Happy travels,<br>
            <strong>Where In India</strong>
          </p>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send email. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('API error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Something went wrong. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
