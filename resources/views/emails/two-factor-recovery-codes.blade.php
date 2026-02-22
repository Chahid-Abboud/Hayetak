<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Recovery Codes</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #111827;">
    <p>Hello {{ $displayName }},</p>

    <p>Your two-factor authentication recovery codes were generated. Store them in a safe place.</p>

    <p>Each code can only be used once:</p>

    <ul>
        @foreach($codes as $code)
            <li><code>{{ $code }}</code></li>
        @endforeach
    </ul>

    <p>If you did not expect this, please sign in and regenerate your recovery codes immediately.</p>
</body>
</html>
