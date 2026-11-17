# Ideenbox – Klinikverbund Landshut

Klickbarer Prototyp einer pseudonymisierten digitalen Ideenbox für einen kommunalen Klinikverbund mit den Standorten Landshut-Mitte, Achdorf, Rottenburg und der Kinderklinik. Mitarbeitende reichen vor allem Einspar- und Effizienzideen ein. Der Verbund muss ab dem 1. Januar 2027 spürbar wirtschaftlicher arbeiten.

Der Verbund und alle Beispielideen sind ein Szenario für die Vorstellung. Es sind keine echten Vorfälle und keine echten Personen.

## Adresse

Nach dem Merge nach `main` und der einmaligen Umstellung der Pages-Quelle:

**https://podli12345.github.io/la-kliniken-ideenbox/**

Dieselben Dateien funktionieren auch unter einer Organisations-Adresse wie `https://la-kliniken-ideenbox.github.io/`, weil alle Pfade relativ sind. Es gibt keinen fest eingebauten Vite-Basispfad und keine absolute Pfadangabe `/la-kliniken-ideenbox/`.

## Prototyp – nur Demodaten

Bitte keine echten Ideen und keine personenbezogenen Daten eingeben. Die Seite hat keinen Server. Alles liegt im `localStorage` dieses Browsers. GitHub Pages ist öffentlich. Auch deshalb dürfen dort keine echten Inhalte stehen.

Die Übersetzungen der Oberfläche (Englisch, Türkisch, Rumänisch, Kroatisch, Polnisch, Ukrainisch, Arabisch) sind maschinell erstellt und müssen noch von Muttersprachlerinnen und Muttersprachlern geprüft werden. Auf der Seite „Warum wir sparen müssen“ steht derselbe Hinweis bei den gelieferten Texten.

## Lokal öffnen

```bash
python3 -m http.server 8080
```

Danach im Browser `http://localhost:8080/` öffnen. Die Seite nicht als Datei (`file://`) öffnen: Modul-Skripte brauchen einen lokalen Webserver.

Prüfungen ohne Browser:

```bash
npm test
```

## Demo-Zugänge

Passwort jeweils `Ideenbox-LA`. Das Passwort schützt nichts.

| Benutzername | Rolle | Was die Person sieht |
| --- | --- | --- |
| `mitarbeiter` | Mitarbeitende/r | Ideen einreichen, unterstützen, kommentieren, eigene Ideen |
| `moderation` | Bereichsmoderator/in | Bereiche Material, Einkauf, Energie, Prozesse, Patientenfluss, Dokumentation |
| `admin` | Ideenmanagement-Admin | alle Bereiche, Moderation, Auswertung, Schalter für die Kommentarprüfung |

Der Zugang `mitarbeiter` ist mit dem Beispiel-Pseudonym `Idee-Fuchs-4821` verbunden, damit „Meine Ideen“ sofort Antworten zeigt. Ein neues Pseudonym pro Idee lässt sich beim Einreichen ankreuzen.

## Bedienung

1. Sprache oben wählen. Arabisch stellt die Schreibrichtung auf rechts nach links.
2. Optional ohne Anmeldung „Warum wir sparen müssen“ lesen und die Sprache des Textes wechseln.
3. Mit einem Demo-Zugang anmelden.
4. Ideen filtern, sortieren und öffnen. Auf der Ideenseite steht der Antwortverlauf: die offizielle Antwort der Funktion (zum Beispiel „Bereich Einkauf“) und Kommentare unter Pseudonym.
5. Unter „Meine Ideen“ liegen nur die eigenen Ideen. Eine Markierung zeigt neue Antworten. Es gibt keine E-Mail und keinen Namen.
6. Eine Idee einreichen. Ähnliche Ideen derselben Sprache erscheinen während der Eingabe. Statt einer Neueinreichung kann eine vorhandene Idee unterstützt oder ergänzt werden.
7. Als Moderation Status, Rückmeldung, Bereich, Zusammenführung und eine deutsche Übersetzung setzen. Eine Ablehnung enthält immer eine Dankesformel und eine sachliche Begründung.
8. Als Admin die Auswertung öffnen. Gruppen unter 5 erscheinen als „<5“.
9. „Demodaten zurücksetzen“ stellt die Beispiele wieder her.

Vor dem ersten Kommentar müssen die Regeln bestätigt werden: sachlich, respektvoll, keine Namen. Beleidigende Begriffe und Personenangaben wie „Dr. X“ werden zurückgewiesen. Kommentare lassen sich melden; die Moderation kann sie ausblenden. Der Admin kann neue Kommentare vor der Veröffentlichung prüfen lassen.

Freiwillige Angaben (Berufsgruppe, Altersgruppe, Betriebszugehörigkeit, Geschlecht, grober Herkunftsbereich) sind voreingestellt auf „keine Angabe“. Sie erscheinen nie an der Idee oder am Pseudonym, nur aggregiert in der Auswertung, und nur ab 5 Nennungen. Es gibt keine Kreuztabellen und keine einzelne Abteilung oder Station.

## Grenzen

- Kein echtes Klinik-Login und kein Zugriffsschutz.
- Daten nur in diesem Browser. Wer die Entwicklerwerkzeuge öffnet, kann die Demodaten im lokalen Speicher lesen. Die Ausblendung kleiner Gruppen schützt die Ansicht.
- Die Ähnlichkeitssuche ist bewusst einfach (Tokens, deutsche Stoppwörter, Stammformen, TF-IDF und Jaccard) und vergleicht nur Ideen derselben Sprache.
- Statuswechsel sind im Prototyp frei schaltbar, damit der Ablauf in der Runde gezeigt werden kann.
- Keine E-Mail, kein externer Übersetzungsdienst, keine Tracker, keine CDN.
- GitHub Pages ist kein Klinikrechenzentrum und kein zulässiger Ort für echte Inhalte.

## Weg zur echten Version

1. Hosting in Deutschland, Auftragsverarbeitung, kein Transfer der Ideeninhalte in Drittländer.
2. Anmeldung nur über das Klinik-Login (SSO, zum Beispiel SAML oder OpenID Connect). Die Ideenbox speichert keine Passwörter.
3. Datenschutzbeauftragte oder Datenschutzbeauftragter prüft Zweck, Rechtsgrundlage, Löschfristen und die Schwelle von 5.
4. Der Personalrat wird beteiligt, auch damit die Box kein Werkzeug der Leistungs- oder Verhaltenskontrolle wird.
5. Zwei getrennte Systeme: das Ideen-Backend sieht nur das Pseudonym. Die Vertrauensstelle speichert die Zuordnung Person ↔ Pseudonym und wird nur für eine Prämienauszahlung tätig.
6. Prämienidee: ein Anteil der im ersten Jahr nachgewiesenen Einsparung. Höhe und Obergrenze legen Geschäftsführung und Personalrat fest.
7. Eine deutsche Übersetzung kann später ein Dienst übernehmen, der in Deutschland oder der EU betrieben wird und die Datenschutzvorgaben erfüllt. Dieser Prototyp ruft keinen Übersetzungsdienst auf.
8. Die Nahtstelle ist `js/repository.js`. Eine spätere HTTP-Implementierung ersetzt `createRepository(localStorage)` in `js/app.js`. Die Methoden bleiben dieselben: `currentUser`, `login`, `logout`, `listIdeas`, `getIdea`, `createIdea`, `supportIdea`, `addComment`, `reportComment`, `setCommentStatus`, `moderateIdea`, `similarIdeas`, `adminStats`, `setPremoderation`, `markSeen`, `resetDemoData`.
9. Weitere Oberflächensprachen: eine JSON-Datei unter `locales/` und ein Eintrag in `UI_LANGS` in `js/config.js`.

## GitHub Pages einrichten

Der Workflow `.github/workflows/pages.yml` veröffentlicht bei jedem Push nach `main` die statischen Dateien. Einmalig im Repository:

1. Settings
2. Pages
3. Build and deployment
4. Source: **GitHub Actions**

Wenn die Quelle noch „Deploy from a branch“ ist, auf „GitHub Actions“ umstellen. Der erste Lauf startet mit dem Merge nach `main` oder manuell unter Actions. Bei einem privaten Repository muss Pages im Tarif erlaubt sein. Für diesen Prototyp genügt ein öffentliches Repository, solange niemand echte Daten eingibt.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `index.html`, `css/app.css` | Oberfläche, ohne externe Bibliothek |
| `js/app.js` | Ablauf und Routen |
| `js/views.js` | Darstellung |
| `js/repository.js` | Datenschicht, austauschbar |
| `js/i18n.js`, `locales/*.json` | Sprachen der Oberfläche |
| `data/spardruck.json` | Texte „Warum wir sparen müssen“ |
| `js/similarity.js` | Dublettencheck im Browser |
| `js/stats.js` | Auswertung mit Schwelle 5 |
| `tools/build_locales.py` | erzeugt die Sprachdateien neu |
