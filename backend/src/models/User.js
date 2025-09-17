import { DataTypes } from "sequelize";
import sequelize from "../database/client.js";
import Preferences from "./Preferences.js"; 

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "users",
    timestamps: false
});

User.hasOne(Preferences, {
    foreignKey: "userId",
    as: "preferences",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
});

export default User;