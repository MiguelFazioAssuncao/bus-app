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


Preferences.updateLocation = async (userId, type, name, distance, time) => {
    if (!['home', 'work'].includes(type)) throw new Error('Invalid type');
    let preferences = await Preferences.findOne({ where: { userId } });
    const value = `${name} - ${distance}m, ${time}min`;
    if (!preferences) {
        const data = { userId };
        data[type] = value;
        await Preferences.create(data);
        return;
    }
    preferences[type] = value;
    await preferences.save();
};

export default Preferences;