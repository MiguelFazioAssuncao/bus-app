import { DataTypes } from "sequelize";
import sequelize from "../database/client.js";

const Preferences = sequelize.define("Preferences", {
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
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('favorites', JSON.stringify(value));
        }
    },
    recents: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('recents');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('recents', JSON.stringify(value));
        }
    }
});

Preferences.updateHome = async (userId, homeName, distance, time) => {
    const preferences = await Preferences.findOne({ where: { userId } });
    if (!preferences) {
        throw new Error("Preferences not found for the user.");
    }
    preferences.home = `${homeName} - ${distance}m, ${time}min`;
    await preferences.save();
};

export default Preferences;