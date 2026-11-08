# build/icon.png dosyasından çok boyutlu build/icon.ico üretir.
param([string]$Png, [string]$Ico)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($Png)
function PngBytes($size) {
  $b = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($src, 0, 0, $size, $size); $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
  return ,$ms.ToArray()
}
$sizes = @(256, 128, 64, 48, 32, 24, 16)
$imgs = @(); foreach ($s in $sizes) { $imgs += ,(PngBytes $s) }
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $d = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
  $bw.Write([Byte]$d); $bw.Write([Byte]$d); $bw.Write([Byte]0); $bw.Write([Byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$imgs[$i].Length); $bw.Write([UInt32]$offset)
  $offset += $imgs[$i].Length
}
foreach ($im in $imgs) { $bw.Write($im) }
$bw.Flush()
[IO.File]::WriteAllBytes($Ico, $ms.ToArray())
$src.Dispose()
"ICO kaydedildi: $Ico"
