import { DataTypes } from "sequelize";
import sequelize from "../database/client.js";

const Preferences = sequelize.define("Preferences", {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    home: {
        type: DataTypes.STRING,
        allowNull: true
    },
    work: {
        type: DataTypes.STRING,
        allowNull: true
    },
    favorites: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('favorites');
            if (!rawValue) return [];
            try {
                return JSON.parse(rawValue);
            } catch {
                return [];
            }
        },
        set(value) {
            this.setDataValue('favorites', JSON.stringify(Array.isArray(value) ? value : []));
        }
    },
    recents: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('recents');
            if (!rawValue) return [];
            try {
                return JSON.parse(rawValue);
            } catch {
                return [];
            }
        },
        set(value) {
            this.setDataValue('recents', JSON.stringify(Array.isArray(value) ? value : []));
        }
    }
});

function formatLocationValue(name, distance, time, extra = {}) {
    const cleanName = String(name || "").replace(/\s*\|\s*/g, " ").trim();
    const hasMetrics = Number.isFinite(Number(distance)) && Number.isFinite(Number(time));
    const head = hasMetrics ? `${cleanName} - ${Math.round(Number(distance))}m, ${Math.round(Number(time))}min` : cleanName;
    const point = extra?.point ? String(extra.point).trim() : "";
    const address = extra?.address ? String(extra.address).replace(/\s*\|\s*/g, " ").trim() : "";
    const parts = [head];
    if (point || address) {
        parts.push(point);
        if (address) parts.push(address);
    }
    return parts.join(" | ").slice(0, 250);
}

Preferences.updateLocation = async (userId, type, name, distance, time, extra = {}) => {
    if (!['home', 'work'].includes(type)) throw new Error('Invalid type');
    let preferences = await Preferences.findOne({ where: { userId } });
    const value = formatLocationValue(name, distance, time, extra);
    if (!preferences) {
        const data = { userId };
        data[type] = value;
        await Preferences.create(data);
        return;
    }
    preferences[type] = value;
    await preferences.save();
};

Preferences.upsertPreferences = async (userId, { home, work, favorites, recents } = {}) => {
    let preferences = await Preferences.findOne({ where: { userId } });
    if (!preferences) {
        preferences = Preferences.build({ userId });
    }
    if (home !== undefined) {
        preferences.home = home
            ? formatLocationValue(
                home.name || "Casa",
                home.distanceMeters,
                home.timeMinutes,
                {
                    point: home.point || (home.lat != null && home.lng != null ? `${home.lat},${home.lng}` : ""),
                    address: home.address || "",
                }
              )
            : null;
    }
    if (work !== undefined) {
        preferences.work = work
            ? formatLocationValue(
                work.name || "Trabalho",
                work.distanceMeters,
                work.timeMinutes,
                {
                    point: work.point || (work.lat != null && work.lng != null ? `${work.lat},${work.lng}` : ""),
                    address: work.address || "",
                }
              )
            : null;
    }
    if (Array.isArray(favorites)) {
        preferences.favorites = favorites.slice(0, 50);
    }
    if (Array.isArray(recents)) {
        preferences.recents = recents.slice(0, 25);
    }
    await preferences.save();
    return preferences;
};

export default Preferences;