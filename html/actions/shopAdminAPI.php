<?php
// Everything the shop admin page (admin/shopAdmin.php) reads and saves:
// items, their pictures, delivery prices, settings and orders. Admin only.
//
//   GET  ?what=state     items, delivery, settings and what is still to set up
//   GET  ?what=orders&show=tosend|sent|all
//   GET  ?what=works     the portfolio's works, to pick an item's picture from
//   POST {action: ...}   saveProduct, orderProducts, archiveProduct, restoreProduct,
//                        saveZones, savePromos, saveSettings, updateOrder, resendEmail,
//                        saveEmails, previewEmail, testEmail   (JSON)
//   POST action=uploadPicture + photo   (a form upload)

include_once __DIR__ . '/../database/session.php';
include __DIR__ . '/../database/pdo.php';
include_once __DIR__ . '/adminAuth.php';
include_once __DIR__ . '/shopOrderFunctions.php';

requireAdminApi();

function adminReply($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    die;
}

// A message Ambar can act on ("Please give the item a name")
function adminFail($message, $status = 400)
{
    adminReply(array('success' => false, 'message' => $message), $status);
}

// "35", "35.5", "35,50", "€ 1 200" -> cents; null if it isn't a price
function shopParsePrice($text)
{
    $text = preg_replace('/[^0-9.,]/', '', (string) $text);
    if ($text === '') {
        return null;
    }
    // The last . or , followed by one or two digits is the decimal point;
    // any others are thousands separators
    if (preg_match('/^(.*)[.,](\d{1,2})$/', $text, $m)) {
        $whole = preg_replace('/[.,]/', '', $m[1]);
        $cents = (int) ($whole === '' ? 0 : $whole) * 100 + (int) str_pad($m[2], 2, '0');
    } else {
        $cents = (int) preg_replace('/[.,]/', '', $text) * 100;
    }
    return $cents;
}

function cleanText($value, $max)
{
    $text = trim((string) (is_scalar($value) ? $value : ''));
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    return $chars && count($chars) > $max ? implode('', array_slice($chars, 0, $max)) : $text;
}

// A file name for an uploaded picture that nothing else is using (a work or
// another item with the same name would otherwise have its picture replaced)
function shopUniquePictureName($conn, $originalName)
{
    $base = trim(preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo((string) $originalName, PATHINFO_FILENAME)), '-');
    $base = 'shop-' . substr($base === '' ? 'picture' : $base, 0, 70);
    $inWorks = $conn->prepare('SELECT COUNT(*) FROM allWorks WHERE fileLocation = ?');
    $inShop = $conn->prepare('SELECT COUNT(*) FROM shopProductImages WHERE fileLocation = ?');
    for ($n = 1; ; $n++) {
        $candidate = $base . ($n > 1 ? '-' . $n : '') . '.jpeg';
        $taken = false;
        foreach (artworkImageDirs() as $dir) {
            if (file_exists($dir . $candidate)) {
                $taken = true;
                break;
            }
        }
        if (!$taken) {
            $inWorks->execute(array($candidate));
            $inShop->execute(array($candidate));
            $taken = $inWorks->fetchColumn() > 0 || $inShop->fetchColumn() > 0;
        }
        if (!$taken) {
            return $candidate;
        }
    }
}

function adminOrderRow($order, $items)
{
    $countries = shopCountries();
    $lines = array();
    foreach ($items as $item) {
        $lines[] = array(
            'name' => $item['productName'],
            'label' => $item['variantLabel'],
            'image' => $item['imageLocation'],
            'quantity' => (int) $item['quantity'],
            'total' => shopMoney((int) $item['unitPriceCents'] * (int) $item['quantity'], $order['currency']),
        );
    }
    $utc = function ($time) {
        return $time ? str_replace(' ', 'T', $time) . 'Z' : null;
    };
    $live = (int) $order['liveMode'] === 1;
    return array(
        'id' => (int) $order['id'],
        'number' => shopOrderNumber($order['id']),
        'status' => $order['status'],
        'test' => !$live,
        'createdAt' => $utc($order['createdAt']),
        'paidAt' => $utc($order['paidAt']),
        'shippedAt' => $utc($order['shippedAt']),
        'subtotal' => shopMoney($order['subtotalCents'], $order['currency']),
        'discount' => (int) $order['discountCents'] > 0 ? shopMoney($order['discountCents'], $order['currency']) : null,
        'promoCode' => $order['promoCode'],
        'shipping' => shopMoney($order['shippingCents'], $order['currency']),
        'total' => shopMoney($order['totalCents'], $order['currency']),
        'zone' => $order['zoneName'],
        'name' => $order['customerName'],
        'email' => $order['customerEmail'],
        'phone' => $order['customerPhone'],
        'address' => array_values(array_filter(array(
            $order['shipName'], $order['shipLine1'], $order['shipLine2'],
            trim($order['shipPostalCode'] . ' ' . $order['shipCity']), $order['shipState'],
            isset($countries[$order['shipCountry']]) ? $countries[$order['shipCountry']] : $order['shipCountry'],
        ), function ($line) { return trim((string) $line) !== ''; })),
        'tracking' => $order['tracking'],
        'note' => (string) $order['note'],
        'stripeUrl' => $order['stripePaymentIntentId']
            ? 'https://dashboard.stripe.com/' . ($live ? '' : 'test/') . 'payments/' . rawurlencode($order['stripePaymentIntentId'])
            : null,
        'lines' => $lines,
    );
}

function adminPromos($conn)
{
    $promos = array();
    foreach ($conn->query('SELECT * FROM shopPromoCodes ORDER BY active DESC, id DESC')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $promos[] = array(
            'id' => (int) $row['id'],
            'code' => $row['code'],
            'kind' => $row['kind'] === 'amount' ? 'amount' : 'percent',
            'value' => (int) $row['value'],
            'maxUses' => $row['maxUses'] === null ? null : (int) $row['maxUses'],
            'usedCount' => (int) $row['usedCount'],
            'endsAt' => $row['endsAt'],
            'active' => (int) $row['active'] === 1,
        );
    }
    return $promos;
}

try {
    $ready = shopReady($conn);

    // -----------------------------------------------------------------------
    // Reading
    // -----------------------------------------------------------------------
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $what = isset($_GET['what']) ? (string) $_GET['what'] : '';

        if ($what === 'state') {
            if (!$ready) {
                adminReply(array('ready' => false));
            }
            try {
                shopReleaseStaleOrders($conn);
                shopCheckProcessingOrders($conn);
            } catch (Throwable $e) {
                error_log('shopAdminAPI: ' . $e->getMessage());
            }
            $zones = shopGetZones($conn);
            $toSend = (int) $conn->query("SELECT COUNT(*) FROM shopOrders WHERE status IN ('paid', 'processing')")->fetchColumn();
            adminReply(array(
                'ready' => true,
                'setup' => array(
                    'stripe' => stripeIsConfigured(),
                    'live' => stripeIsLive(),
                    'webhook' => trim((string) env('STRIPE_WEBHOOK_SECRET', '')) !== '',
                    'zones' => count($zones) > 0,
                    'email' => shopEmailConfigured(),
                    'emailFrom' => shopEmailFrom(),
                ),
                'settings' => shopSettings($conn),
                'currencies' => shopCurrencies(),
                'countries' => shopCountries(),
                'zones' => $zones,
                'promos' => adminPromos($conn),
                'products' => shopGetProducts($conn, array('status' => 'all')),
                'archived' => shopGetProducts($conn, array('status' => 'all', 'archived' => true)),
                'toSend' => $toSend,
            ));
        }

        if (!$ready) {
            adminFail("The shop's tables haven't been created yet.", 503);
        }

        if ($what === 'orders') {
            $show = isset($_GET['show']) ? (string) $_GET['show'] : 'tosend';
            $where = "status IN ('paid', 'processing')";
            $order = 'paidAt ASC, id ASC'; // oldest first: the one that has waited longest
            if ($show === 'sent') {
                $where = "status = 'shipped'";
                $order = 'shippedAt DESC, id DESC';
            } elseif ($show === 'all') {
                $where = "status NOT IN ('pending', 'cancelled')";
                $order = 'id DESC';
            }
            $orders = $conn->query("SELECT * FROM shopOrders WHERE $where ORDER BY $order LIMIT 300")->fetchAll(PDO::FETCH_ASSOC);
            $items = shopOrderItems($conn, array_map(function ($row) { return (int) $row['id']; }, $orders));
            $list = array();
            foreach ($orders as $row) {
                $list[] = adminOrderRow($row, isset($items[(int) $row['id']]) ? $items[(int) $row['id']] : array());
            }
            adminReply(array('orders' => $list));
        }

        if ($what === 'works') {
            $rows = $conn->query('SELECT workId, fileLocation, name, desc2 FROM allWorks WHERE visible = 1 ORDER BY orderOfDisplay DESC, workId DESC')
                         ->fetchAll(PDO::FETCH_ASSOC);
            $works = array();
            foreach ($rows as $row) {
                $works[] = array('id' => (int) $row['workId'], 'location' => (string) $row['fileLocation'],
                    'name' => trim((string) $row['name']), 'details' => trim(str_replace(array("\r", "\n"), array('', ' | '), (string) $row['desc2'])));
            }
            adminReply(array('works' => $works));
        }

        adminFail('Unknown request');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        adminFail('Unknown request', 405);
    }
    if (!$ready) {
        adminFail("The shop's tables haven't been created yet.", 503);
    }

    // -----------------------------------------------------------------------
    // A picture upload (a form post, not JSON). The picture is stored exactly
    // like a work's, so the site's web-sized copies and zoom work for it.
    // -----------------------------------------------------------------------
    if (isset($_POST['action']) && $_POST['action'] === 'uploadPicture') {
        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            $code = isset($_FILES['photo']) ? $_FILES['photo']['error'] : UPLOAD_ERR_NO_FILE;
            $tooBig = in_array($code, array(UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE), true);
            adminFail($tooBig ? 'The picture is too large for the server.' : 'The picture did not arrive. Please try again.', $tooBig ? 413 : 400);
        }
        $photo = $_FILES['photo'];
        $tooLarge = uploadTooLargeMessage($photo['tmp_name']);
        if ($tooLarge !== null) {
            adminFail($tooLarge, 413);
        }

        $baseDir = '../baseImages/';
        $thumbDir = '../thumbnails/';
        $webDir = $baseDir . 'web/';
        foreach (array($baseDir, $thumbDir) as $dir) {
            if ((!is_dir($dir) && !@mkdir($dir, 0755, true)) || !is_writable($dir)) {
                adminFail("The pictures folder can't be written to.", 500);
            }
        }
        $fileName = shopUniquePictureName($conn, $photo['name']);
        try {
            convertToProgressiveJPEGAndUpload($photo['tmp_name'], $baseDir . $fileName);
            createAndSaveThumbnail($baseDir . $fileName, $thumbDir, $fileName);
        } catch (Throwable $e) {
            @unlink($baseDir . $fileName);
            @unlink($thumbDir . $fileName);
            error_log('Shop picture upload failed: ' . $e->getMessage());
            adminFail('This picture could not be read. Please use a JPEG, PNG or GIF.', 415);
        }
        try {
            if (is_dir($webDir) || @mkdir($webDir, 0755, true)) {
                createWebImage($baseDir . $fileName, $webDir . $fileName);
                createWebImageVariants($webDir . $fileName, $webDir, $fileName);
            }
        } catch (Throwable $e) {
            // webImage.php makes them on the first visit instead
            error_log('Shop picture web copy not made for ' . $fileName . ': ' . $e->getMessage());
        }
        adminReply(array('success' => true, 'location' => $fileName));
    }

    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        adminFail('Unknown request');
    }
    $action = isset($input['action']) ? (string) $input['action'] : '';

    // -----------------------------------------------------------------------
    // Items
    // -----------------------------------------------------------------------
    if ($action === 'saveProduct') {
        $id = isset($input['id']) ? (int) $input['id'] : 0;
        $name = cleanText($input['name'] ?? '', 255);
        $status = ($input['status'] ?? '') === 'live' ? 'live' : 'draft';
        $isUnique = !empty($input['isUnique']);
        if ($name === '') {
            adminFail('Please give the item a name.');
        }

        // Pictures: names of files already on the server (picked from the
        // works, or just uploaded)
        $images = array();
        foreach (is_array($input['images'] ?? null) ? $input['images'] : array() as $location) {
            $location = basename((string) $location);
            if ($location !== '' && $location[0] !== '.' && is_file('../baseImages/' . $location) && !in_array($location, $images, true)) {
                $images[] = $location;
            }
        }

        // What can be bought. An original has a single one.
        $variants = array();
        foreach (is_array($input['variants'] ?? null) ? $input['variants'] : array() as $variant) {
            if (!is_array($variant)) {
                continue;
            }
            $price = shopParsePrice($variant['price'] ?? '');
            $label = cleanText($variant['label'] ?? '', 120);
            if ($price === null && $label === '') {
                continue; // an empty row
            }
            if ($price === null || $price < 50) {
                adminFail($isUnique ? 'Please give the item a price.' : 'Please give every option a price.');
            }
            if ($price > 99999900) {
                adminFail('That price is too high for the shop to take.');
            }
            $stockText = trim((string) ($variant['stock'] ?? ''));
            $stock = $stockText === '' ? null : max(0, min(100000, (int) $stockText));
            $wasText = isset($variant['stockWas']) ? trim((string) $variant['stockWas']) : null;
            $variants[] = array(
                'id' => isset($variant['id']) ? (int) $variant['id'] : 0,
                'label' => $label,
                'priceCents' => $price,
                'stock' => $isUnique ? ($stock === 0 ? 0 : 1) : $stock,
                'stockWas' => $wasText === null || $wasText === '' ? null : (int) $wasText,
            );
            if ($isUnique) {
                break;
            }
        }
        if ($status === 'live') {
            if (!$images) {
                adminFail('Please add a picture before putting the item in the shop.');
            }
            if (!$variants) {
                adminFail('Please give the item a price before putting it in the shop.');
            }
        }

        $fields = array(
            'name' => $name,
            'typeLabel' => cleanText($input['typeLabel'] ?? '', 60),
            'isUnique' => $isUnique ? 1 : 0,
            'details' => cleanText($input['details'] ?? '', 500),
            'description' => cleanText($input['description'] ?? '', 10000),
            'workId' => !empty($input['workId']) ? (int) $input['workId'] : null,
            'shippingClass' => ($input['shippingClass'] ?? '') === 'large' ? 'large' : 'standard',
            'status' => $status,
            'updatedAt' => shopNow(),
        );

        $conn->beginTransaction();
        try {
            if ($id) {
                $exists = $conn->prepare('SELECT COUNT(*) FROM shopProducts WHERE id = ?');
                $exists->execute(array($id));
                if (!$exists->fetchColumn()) {
                    throw new ShopProblem("That item doesn't exist any more.");
                }
                $sets = implode(', ', array_map(function ($column) { return "$column = ?"; }, array_keys($fields)));
                $conn->prepare("UPDATE shopProducts SET $sets WHERE id = ?")->execute(array_merge(array_values($fields), array($id)));
            } else {
                // New items go to the top of the shop
                $first = (int) $conn->query('SELECT COALESCE(MIN(sortOrder), 0) FROM shopProducts')->fetchColumn();
                $fields['sortOrder'] = $first - 1;
                $fields['createdAt'] = shopNow();
                $columns = implode(', ', array_keys($fields));
                $marks = implode(', ', array_fill(0, count($fields), '?'));
                $conn->prepare("INSERT INTO shopProducts ($columns) VALUES ($marks)")->execute(array_values($fields));
                $id = (int) $conn->lastInsertId();
            }

            $conn->prepare('DELETE FROM shopProductImages WHERE productId = ?')->execute(array($id));
            $addImage = $conn->prepare('INSERT INTO shopProductImages (productId, fileLocation, sortOrder) VALUES (?, ?, ?)');
            foreach ($images as $index => $location) {
                $addImage->execute(array($id, $location, $index));
            }

            // Options that were removed are switched off, not deleted
            $current = $conn->prepare('SELECT id FROM shopVariants WHERE productId = ? AND active = 1');
            $current->execute(array($id));
            $existing = array_map('intval', $current->fetchAll(PDO::FETCH_COLUMN));
            // An original someone is paying for right now keeps the stock it
            // has: marking it available would put it on sale a second time,
            // and marking it sold would come undone if they don't finish
            $heldNow = $isUnique ? shopHeldStock($conn, $existing) : array();
            $kept = array();
            foreach ($variants as $index => $variant) {
                if ($variant['id'] && in_array($variant['id'], $existing, true)) {
                    $kept[] = $variant['id'];
                    $conn->prepare('UPDATE shopVariants SET label = ?, priceCents = ?, sortOrder = ? WHERE id = ?')
                         ->execute(array($variant['label'], $variant['priceCents'], $index, $variant['id']));
                    // Stock moves by the difference between what the page
                    // showed and what was typed, so a sale that happened
                    // while the page was open isn't undone by saving
                    if (!empty($heldNow[$variant['id']])) {
                        // (left as it is: see $heldNow)
                    } elseif ($variant['stock'] === null) {
                        $conn->prepare('UPDATE shopVariants SET stock = NULL WHERE id = ?')->execute(array($variant['id']));
                    } elseif ($variant['stockWas'] === null) {
                        $conn->prepare('UPDATE shopVariants SET stock = ? WHERE id = ?')->execute(array($variant['stock'], $variant['id']));
                    } elseif ($variant['stock'] !== $variant['stockWas']) {
                        $conn->prepare('UPDATE shopVariants SET stock = GREATEST(0, COALESCE(stock, 0) + ?) WHERE id = ?')
                             ->execute(array($variant['stock'] - $variant['stockWas'], $variant['id']));
                    }
                } else {
                    $conn->prepare('INSERT INTO shopVariants (productId, label, priceCents, stock, sortOrder, active) VALUES (?, ?, ?, ?, ?, 1)')
                         ->execute(array($id, $variant['label'], $variant['priceCents'], $variant['stock'], $index));
                    $kept[] = (int) $conn->lastInsertId();
                }
            }
            foreach (array_diff($existing, $kept) as $gone) {
                $conn->prepare('UPDATE shopVariants SET active = 0 WHERE id = ?')->execute(array($gone));
            }
            $conn->commit();
        } catch (ShopProblem $e) {
            $conn->rollBack();
            adminFail($e->getMessage());
        } catch (Throwable $e) {
            $conn->rollBack();
            throw $e;
        }
        adminReply(array('success' => true, 'id' => $id));
    }

    // The order the items appear in the shop: the ids, first to last
    if ($action === 'orderProducts') {
        $set = $conn->prepare('UPDATE shopProducts SET sortOrder = ? WHERE id = ?');
        foreach (array_values(is_array($input['ids'] ?? null) ? $input['ids'] : array()) as $index => $id) {
            $set->execute(array($index, (int) $id));
        }
        adminReply(array('success' => true));
    }

    // "Deleting" an item only puts it away: past orders still refer to it,
    // and it can be brought back
    if ($action === 'archiveProduct' || $action === 'restoreProduct') {
        $conn->prepare('UPDATE shopProducts SET status = ?, updatedAt = ? WHERE id = ?')
             ->execute(array($action === 'archiveProduct' ? 'archived' : 'draft', shopNow(), (int) ($input['id'] ?? 0)));
        adminReply(array('success' => true));
    }

    // -----------------------------------------------------------------------
    // Delivery and settings
    // -----------------------------------------------------------------------
    if ($action === 'saveZones') {
        $zones = array();
        $elsewhere = 0;
        $claimed = array();
        foreach (is_array($input['zones'] ?? null) ? $input['zones'] : array() as $zone) {
            if (!is_array($zone)) {
                continue;
            }
            $name = cleanText($zone['name'] ?? '', 120);
            $countries = ($zone['countries'] ?? null) === '*' ? '*'
                : shopParseCountries(is_array($zone['countries'] ?? null) ? implode(',', $zone['countries']) : '');
            if ($name === '') {
                adminFail('Please give every destination a name (for example "Europe").');
            }
            if ($countries === '*') {
                $elsewhere++;
            } elseif (!$countries) {
                adminFail('Please choose the countries for "' . $name . '".');
            } else {
                foreach ($countries as $code) {
                    if (isset($claimed[$code])) {
                        adminFail(shopCountries()[$code] . ' is in both "' . $claimed[$code] . '" and "' . $name . '". Please keep it in just one.');
                    }
                    $claimed[$code] = $name;
                }
            }
            $standard = shopParsePrice($zone['standard'] ?? '');
            $large = shopParsePrice($zone['large'] ?? '');
            if ($standard === null || $large === null) {
                adminFail('Please give "' . $name . '" both delivery prices (0 for free delivery).');
            }
            $zones[] = array($name, $countries === '*' ? '*' : implode(',', $countries), $standard, $large);
        }
        if ($elsewhere > 1) {
            adminFail('Only one destination can be "everywhere else".');
        }
        $conn->beginTransaction();
        try {
            $conn->exec('DELETE FROM shopShippingZones');
            $add = $conn->prepare('INSERT INTO shopShippingZones (name, countries, priceStandardCents, priceLargeCents, sortOrder) VALUES (?, ?, ?, ?, ?)');
            foreach ($zones as $index => $zone) {
                $add->execute(array($zone[0], $zone[1], $zone[2], $zone[3], $index));
            }
            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollBack();
            throw $e;
        }
        adminReply(array('success' => true, 'zones' => shopGetZones($conn)));
    }

    // Promo codes: the whole list as it is on screen. A code keeps its count
    // of uses when edited; one left off the list is removed (orders that
    // used it keep its name).
    if ($action === 'savePromos') {
        $rows = array();
        $seen = array();
        foreach (is_array($input['promos'] ?? null) ? $input['promos'] : array() as $promo) {
            if (!is_array($promo)) {
                continue;
            }
            $typed = trim((string) ($promo['code'] ?? ''));
            $code = shopCleanCode($typed);
            if ($typed === '' && trim((string) ($promo['value'] ?? '')) === '') {
                continue; // an empty row
            }
            if ($code === '' || strlen($code) < 3) {
                adminFail('Please give every code at least three letters or numbers (for example SPRING10).');
            }
            if (isset($seen[$code])) {
                adminFail('The code ' . $code . ' is in the list twice. Each code can only be there once.');
            }
            $seen[$code] = true;
            $kind = ($promo['kind'] ?? '') === 'amount' ? 'amount' : 'percent';
            if ($kind === 'percent') {
                $value = (int) preg_replace('/[^0-9]/', '', (string) ($promo['value'] ?? ''));
                if ($value < 1 || $value > 100) {
                    adminFail('Please say how much ' . $code . ' takes off: a percentage between 1 and 100.');
                }
            } else {
                $value = shopParsePrice($promo['value'] ?? '');
                if ($value === null || $value < 1) {
                    adminFail('Please say how much ' . $code . ' takes off.');
                }
            }
            $usesText = trim((string) ($promo['maxUses'] ?? ''));
            $ends = trim((string) ($promo['endsAt'] ?? ''));
            if ($ends !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $ends)) {
                adminFail('Please check the last day for ' . $code . '.');
            }
            $rows[] = array(
                'id' => isset($promo['id']) ? (int) $promo['id'] : 0,
                'code' => $code,
                'kind' => $kind,
                'value' => $value,
                'maxUses' => $usesText === '' ? null : max(1, min(1000000, (int) $usesText)),
                'endsAt' => $ends === '' ? null : $ends,
                'active' => !empty($promo['active']) ? 1 : 0,
            );
        }
        $conn->beginTransaction();
        try {
            $existing = array_map('intval', $conn->query('SELECT id FROM shopPromoCodes')->fetchAll(PDO::FETCH_COLUMN));
            $kept = array();
            foreach ($rows as $row) {
                if ($row['id'] && in_array($row['id'], $existing, true)) {
                    $kept[] = $row['id'];
                }
            }
            // Removed ones first, so a new code may reuse a removed one's name
            foreach (array_diff($existing, $kept) as $gone) {
                $conn->prepare('DELETE FROM shopPromoCodes WHERE id = ?')->execute(array($gone));
            }
            foreach ($rows as $row) {
                $values = array($row['code'], $row['kind'], $row['value'], $row['maxUses'], $row['endsAt'], $row['active']);
                if (in_array($row['id'], $kept, true)) {
                    $conn->prepare('UPDATE shopPromoCodes SET code = ?, kind = ?, value = ?, maxUses = ?, endsAt = ?, active = ? WHERE id = ?')
                         ->execute(array_merge($values, array($row['id'])));
                } else {
                    $conn->prepare('INSERT INTO shopPromoCodes (code, kind, value, maxUses, endsAt, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
                         ->execute(array_merge($values, array(shopNow())));
                }
            }
            $conn->commit();
        } catch (PDOException $e) {
            $conn->rollBack();
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                adminFail('Two codes ended up with the same name. Please give each a different one.');
            }
            throw $e;
        }
        adminReply(array('success' => true, 'promos' => adminPromos($conn)));
    }

    if ($action === 'saveSettings') {
        $currency = strtolower((string) ($input['currency'] ?? ''));
        if (!isset(shopCurrencies()[$currency])) {
            adminFail('Please choose a currency.');
        }
        shopSaveSetting($conn, 'currency', $currency);
        shopSaveSetting($conn, 'intro', cleanText($input['intro'] ?? '', 1000));
        shopSaveSetting($conn, 'deliveryNote', cleanText($input['deliveryNote'] ?? '', 1000));
        shopSaveSetting($conn, 'paused', !empty($input['paused']) ? '1' : '0');
        shopSaveSetting($conn, 'inMenu', !empty($input['inMenu']) ? '1' : '0');
        adminReply(array('success' => true, 'settings' => shopSettings($conn, true)));
    }

    // -----------------------------------------------------------------------
    // Orders
    // -----------------------------------------------------------------------
    if ($action === 'updateOrder') {
        $order = shopFindOrder($conn, 'id', (int) ($input['id'] ?? 0));
        if (!$order) {
            adminFail("That order doesn't exist.", 404);
        }
        if (array_key_exists('note', $input)) {
            $conn->prepare('UPDATE shopOrders SET note = ? WHERE id = ?')->execute(array(cleanText($input['note'], 5000), (int) $order['id']));
        }
        if (array_key_exists('tracking', $input)) {
            $conn->prepare('UPDATE shopOrders SET tracking = ? WHERE id = ?')->execute(array(cleanText($input['tracking'], 500), (int) $order['id']));
        }
        $emailed = false;
        if (isset($input['sent'])) {
            if ($input['sent']) {
                $shipped = $conn->prepare("UPDATE shopOrders SET status = 'shipped', shippedAt = ? WHERE id = ? AND status = 'paid'");
                $shipped->execute(array(shopNow(), (int) $order['id']));
                if ($shipped->rowCount() === 1) {
                    $emailed = shopEmailOrderShipped($conn, (int) $order['id']);
                }
            } else {
                $conn->prepare("UPDATE shopOrders SET status = 'paid', shippedAt = NULL WHERE id = ? AND status = 'shipped'")
                     ->execute(array((int) $order['id']));
            }
        }
        adminReply(array('success' => true, 'emailed' => $emailed));
    }

    // Sends a buyer's email again (it failed, or they lost it)
    if ($action === 'resendEmail') {
        $order = shopFindOrder($conn, 'id', (int) ($input['id'] ?? 0));
        $kind = (string) ($input['kind'] ?? '');
        if (!$order || !in_array($kind, array('confirm', 'shipped'), true)) {
            adminFail("That order doesn't exist.", 404);
        }
        if (!shopEmailConfigured()) {
            adminFail("Emails aren't connected yet, so nothing could be sent.");
        }
        if (!shopEmailIsAddress($order['customerEmail'])) {
            adminFail("This order has no email address to send to.");
        }
        try {
            $email = shopEmailBuild($conn, $kind, $order, shopSettings($conn));
            shopEmailSend($order['customerEmail'], $email['subject'], $email['html'], $email['text'], shopSettings($conn)['emailOwner']);
        } catch (ShopEmailError $e) {
            error_log('shopAdminAPI resend: ' . $e->getMessage());
            adminFail("The email couldn't be sent just now. Please try again in a little while.", 502);
        }
        adminReply(array('success' => true, 'to' => $order['customerEmail']));
    }

    // -----------------------------------------------------------------------
    // Emails
    // -----------------------------------------------------------------------

    // The wording as typed on the Emails tab (saved or not yet), with
    // anything unusable replaced by what's saved
    $emailDraft = function ($input) use ($conn) {
        $settings = shopSettings($conn);
        $draft = isset($input['emails']) && is_array($input['emails']) ? $input['emails'] : array();
        foreach (array('emailConfirmSubject' => 200, 'emailShippedSubject' => 200,
                       'emailConfirmText' => 5000, 'emailShippedText' => 5000, 'emailSignature' => 1000) as $name => $max) {
            if (array_key_exists($name, $draft)) {
                $settings[$name] = str_replace("\r", '', cleanText($draft[$name], $max));
            }
        }
        foreach (array('emailConfirmOn', 'emailShippedOn', 'emailAlertOn') as $name) {
            if (array_key_exists($name, $draft)) {
                $settings[$name] = !empty($draft[$name]) ? '1' : '0';
            }
        }
        if (array_key_exists('emailOwner', $draft)) {
            $settings['emailOwner'] = cleanText($draft['emailOwner'], 255);
        }
        return $settings;
    };

    if ($action === 'saveEmails') {
        $settings = $emailDraft($input);
        if ($settings['emailOwner'] !== '' && !shopEmailIsAddress($settings['emailOwner'])) {
            adminFail('Your email address doesn\'t look quite right. Please check it.');
        }
        foreach (array('emailConfirmSubject', 'emailShippedSubject') as $name) {
            if ($settings[$name] === '') {
                adminFail('Each email needs a subject line.');
            }
        }
        foreach (array_keys(shopEmailDefaults()) as $name) {
            shopSaveSetting($conn, $name, $settings[$name]);
        }
        adminReply(array('success' => true, 'settings' => shopSettings($conn, true)));
    }

    if ($action === 'previewEmail' || $action === 'testEmail') {
        $kind = (string) ($input['kind'] ?? '');
        if (!in_array($kind, array('confirm', 'shipped', 'alert'), true)) {
            adminFail('Unknown email');
        }
        $settings = $emailDraft($input);
        list($sample, $items) = shopEmailSampleOrder($conn, $settings);
        $email = shopEmailBuild($conn, $kind, $sample, $settings, $items);
        if ($action === 'previewEmail') {
            adminReply(array('success' => true, 'subject' => $email['subject'], 'html' => $email['html']));
        }
        if (!shopEmailConfigured()) {
            adminFail("Emails aren't connected yet, so a test can't be sent. The preview shows how it will look.");
        }
        if (!shopEmailIsAddress($settings['emailOwner'])) {
            adminFail('Please fill in your own email address first: that\'s where the test goes.');
        }
        try {
            shopEmailSend($settings['emailOwner'], '[Test email] ' . $email['subject'], $email['html'], $email['text']);
        } catch (ShopEmailError $e) {
            error_log('shopAdminAPI test email: ' . $e->getMessage());
            adminFail("The test email couldn't be sent. Please try again in a little while.", 502);
        }
        adminReply(array('success' => true, 'to' => $settings['emailOwner']));
    }

    adminFail('Unknown request');
} catch (Throwable $e) {
    error_log('shopAdminAPI: ' . $e->getMessage());
    adminFail('Sorry, something went wrong and this was not saved. Please try again.', 500);
}
