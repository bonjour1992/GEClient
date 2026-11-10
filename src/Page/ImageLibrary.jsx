
import { getImage, pub, saveImage } from "../lib/fetch";
import { useEffect, useState } from "react";


export function normalizePath(path = "") {
    return path
        .replaceAll("\\", "/")
        .replace(/^\/+|\/+$/g, "");
}


export function findFolder(root, path) {
    path = normalizePath(path);

    if (!path)
        return root;

    let current = root;

    for (const part of path.split("/")) {
        current = current?.children?.find(
            child =>
                child.type === "directory" &&
                child.name === part
        );

        if (!current)
            return undefined;
    }

    return current;
}


export function FolderTree({
    folder,
    currentPath,
    onOpenFolder,
    level = 0
}) {
    const folders = folder?.children?.filter(
        child => child.type === "directory"
    ) || [];

    return (
        <div>
            {level === 0 && (
                <div
                    onClick={() =>
                        onOpenFolder({ relativePath: "" })
                    }
                    style={{
                        padding: "7px 8px",
                        cursor: "pointer",
                        fontWeight: !currentPath ? 700 : 400,
                        backgroundColor: !currentPath
                            ? "#eee"
                            : "transparent"
                    }}
                >
                    📁 /
                </div>
            )}

            {folders.map(folder => {
                const path = normalizePath(
                    folder.relativePath
                );

                const selected =
                    path === normalizePath(currentPath);

                return (
                    <div key={path}>
                        <div
                            onClick={() =>
                                onOpenFolder(folder)
                            }
                            style={{
                                padding: "7px 8px",
                                paddingLeft:
                                    8 + level * 15,
                                cursor: "pointer",
                                fontWeight:
                                    selected ? 700 : 400,
                                backgroundColor:
                                    selected
                                        ? "#eee"
                                        : "transparent"
                            }}
                        >
                            📁 {folder.name}
                        </div>

                        <FolderTree
                            folder={folder}
                            currentPath={currentPath}
                            onOpenFolder={onOpenFolder}
                            level={level + 1}
                        />
                    </div>
                );
            })}
        </div>
    );
}


export function Breadcrumb({
    path,
    onRoot,
    onNavigate
}) {
    const parts = normalizePath(path)
        .split("/")
        .filter(Boolean);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 20,
            color: "#666"
        }}>
            <button onClick={onRoot}>
                /
            </button>

            {parts.map((part, index) => (
                <span key={index}>
                    /

                    <button
                        onClick={() =>
                            onNavigate(index)
                        }
                        style={{ marginLeft: 3 }}
                    >
                        {part}
                    </button>
                </span>
            ))}
        </div>
    );
}


export function FolderGrid({
    folders,
    onOpenFolder
}) {
    if (!folders.length)
        return null;

    return (
        <div style={{ marginBottom: 25 }}>
            <div style={{
                fontWeight: 700,
                marginBottom: 10
            }}>
                Dossiers
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns:
                    "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 10
            }}>
                {folders.map(folder => (
                    <div
                        key={folder.relativePath}
                        onClick={() =>
                            onOpenFolder(folder)
                        }
                        style={{
                            padding: 15,
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            cursor: "pointer",
                            backgroundColor: "#fafafa"
                        }}
                    >
                        📁 {folder.name}
                    </div>
                ))}
            </div>
        </div>
    );
}


// ============================================================
// VIGNETTES
//
// La grille n'affiche pas les images d'origine (jusqu'à plusieurs
// Mo chacune) mais leur vignette de 240 px : public/_vignettes/
// <chemin de l'image>.png. Une image sans vignette (SVG, image
// légère, image ajoutée à la main sur le serveur) s'affiche telle
// quelle. Seules les images de plus de 200 Ko ont une vignette,
// créée à leur ajout (uploadImage).
// ============================================================

export const DOSSIER_VIGNETTES = "_vignettes";
const TAILLE_VIGNETTE = 240;
const POIDS_MINIMAL = 200 * 1024;

const cheminVignette = chemin => `${DOSSIER_VIGNETTES}/${chemin}.png`;

function Vignette({ chemin, nom }) {

    // SVG : déjà léger, pas de vignette
    const [origine, setOrigine] = useState(/\.svg$/i.test(chemin));

    return (
        <img
            src={encodeURI(pub + "/" + (origine ? chemin : cheminVignette(chemin)))}
            alt={nom}
            // (seules les images visibles sont chargées)
            loading="lazy"
            decoding="async"
            onError={() => setOrigine(true)}
            style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain"
            }}
        />
    );
}

// Vignette PNG d'un fichier image, ou null (SVG, image légère ou illisible)
async function creerVignette(file) {

    if (/svg/i.test(file.type) || file.size <= POIDS_MINIMAL) {
        return null;
    }

    try {
        const image = await createImageBitmap(file);
        const echelle = Math.min(1, TAILLE_VIGNETTE / Math.max(image.width, image.height));
        const toile = document.createElement("canvas");

        toile.width = Math.max(1, Math.round(image.width * echelle));
        toile.height = Math.max(1, Math.round(image.height * echelle));
        toile.getContext("2d").drawImage(image, 0, 0, toile.width, toile.height);

        return await new Promise(resolve => toile.toBlob(resolve, "image/png"));
    } catch (error) {
        console.error("Vignette impossible :", error);
        return null;
    }
}


export function ImageGrid({
    files,
    selected,
    onSelect
}) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns:
                "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 15
        }}>
            {files.map(file => {
                const path =
                    "/" + normalizePath(file.relativePath);

                const isSelected =
                    selected === path;

                return (
                    <div
                        key={file.relativePath}
                        onClick={() =>
                            onSelect(path)
                        }
                        style={{
                            border: isSelected
                                ? "3px solid #2684ff"
                                : "1px solid #ddd",
                            borderRadius: 6,
                            padding: 8,
                            cursor: "pointer",
                            backgroundColor: isSelected
                                ? "#eef6ff"
                                : "#fff"
                        }}
                    >
                        <div style={{
                            width: "100%",
                            height: 140,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f5f5f5",
                            overflow: "hidden"
                        }}>
                            <Vignette
                                chemin={normalizePath(file.relativePath)}
                                nom={file.name}
                            />
                        </div>

                        <div
                            title={file.name}
                            style={{
                                marginTop: 8,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {file.name}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


export function ImageLibrary({
    selected = "",
    onSelect,
    showPreview = true
}) {
    const [image, setImage] = useState({
        name: "loading",
        children: []
    });

    const [currentFolderPath, setCurrentFolderPath] =
        useState("");

    const [uploading, setUploading] =
        useState(false);


    useEffect(() => {
        loadImages();
    }, []);


    async function loadImages() {
        try {
            const arbre = await getImage();

            // Le dossier des vignettes n'est pas un dossier d'images à parcourir
            setImage({
                ...arbre,
                children: (arbre?.children || []).filter(e => e.name !== DOSSIER_VIGNETTES)
            });
        } catch (error) {
            console.error(
                "Erreur lors du chargement des images :",
                error
            );
        }
    }


    const currentFolder =
        findFolder(
            image,
            currentFolderPath
        ) || image;


    const folders =
        currentFolder?.children?.filter(
            item => item.type === "directory"
        ) || [];


    const files =
        currentFolder?.children?.filter(
            item => item.type === "file"
        ) || [];


    function select(value) {
        if (onSelect)
            onSelect(value);
    }


    function openFolder(folder) {
        setCurrentFolderPath(
            normalizePath(folder.relativePath)
        );

        select("");
    }


    function openRoot() {
        setCurrentFolderPath("");
        select("");
    }


    function openBreadcrumb(index) {
        const parts =
            normalizePath(
                currentFolderPath
            ).split("/").filter(Boolean);

        setCurrentFolderPath(
            parts.slice(0, index + 1).join("/")
        );

        select("");
    }


    async function uploadImage(e) {
        const file = e.target.files?.[0];

        if (!file)
            return;

        try {
            setUploading(true);

            const folder =
                normalizePath(
                    currentFolderPath
                );

            const path = folder
                ? `${folder}/${file.name}`
                : file.name;

            await saveImage(file, path);

            // Sa vignette, pour la grille (sans elle, l'image s'affiche telle quelle)
            const vignette = await creerVignette(file);

            if (vignette) {
                await saveImage(vignette, cheminVignette(path));
            }

            await loadImages();

            select("/" + path);

        } catch (error) {
            console.error(
                "Erreur lors de l'upload :",
                error
            );
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }


    return (
        <div style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "250px 1fr"
        }}>

            {/* Arbre */}

            <div style={{
                overflow: "auto",
                borderRight: "1px solid #ccc",
                padding: 10
            }}>
                <FolderTree
                    folder={image}
                    currentPath={currentFolderPath}
                    onOpenFolder={openFolder}
                />
            </div>


            {/* Contenu */}

            <div style={{
                overflow: "auto",
                padding: 20
            }}>

                <div style={{
                    display: "flex",
                    justifyContent: "space-between"
                }}>
                    <Breadcrumb
                        path={currentFolderPath}
                        onRoot={openRoot}
                        onNavigate={openBreadcrumb}
                    />

                    <label style={{
                        height: "fit-content",
                        padding: "8px 14px",
                        backgroundColor:
                            uploading ? "#aaa" : "#333",
                        color: "#fff",
                        borderRadius: 5,
                        cursor:
                            uploading
                                ? "default"
                                : "pointer"
                    }}>
                        {uploading
                            ? "Upload..."
                            : "Ajouter une image"}

                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploading}
                            onChange={uploadImage}
                            style={{ display: "none" }}
                        />
                    </label>
                </div>


                <FolderGrid
                    folders={folders}
                    onOpenFolder={openFolder}
                />


                <div style={{
                    fontWeight: 700,
                    marginBottom: 10
                }}>
                    Images
                </div>


                {files.length ? (
                    <ImageGrid
                        files={files}
                        selected={selected}
                        onSelect={select}
                    />
                ) : (
                    <div style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#888"
                    }}>
                        Aucune image dans ce dossier.
                    </div>
                )}


                {showPreview && selected && (
                    <div style={{
                        marginTop: 30,
                        paddingTop: 20,
                        borderTop: "1px solid #ddd"
                    }}>
                        <div style={{
                            fontWeight: 700,
                            marginBottom: 10
                        }}>
                            Aperçu
                        </div>

                        <img
                            src={pub + selected}
                            alt={selected}
                            style={{
                                maxWidth: 400,
                                maxHeight: 300,
                                objectFit: "contain"
                            }}
                        />

                        <div style={{
                            marginTop: 10,
                            color: "#666"
                        }}>
                            {selected}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

