CREATE TABLE IF NOT EXISTS suppliers (
    _id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- Phones (linked to supplier)
CREATE TABLE IF NOT EXISTS phones (
    supp_id INT NOT NULL,
    number VARCHAR(30) NOT NULL,
    PRIMARY KEY (supp_id, number),
    FOREIGN KEY (supp_id) REFERENCES suppliers(_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Orders (uniquely identified by supp_id + when)
CREATE TABLE IF NOT EXISTS orders (
    supp_id INT NOT NULL,
    `when` DATE NOT NULL,
    PRIMARY KEY (supp_id, `when`),
    FOREIGN KEY (supp_id) REFERENCES suppliers(_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Order Items (linked to orders via supp_id + when)
CREATE TABLE IF NOT EXISTS order_items (
    supp_id INT NOT NULL,
    `when` DATE NOT NULL,
    part_id INT NOT NULL,
    qty INT NOT NULL,
    PRIMARY KEY (supp_id, `when`, part_id),
    FOREIGN KEY (supp_id, `when`) REFERENCES orders(supp_id, `when`) ON DELETE CASCADE
) ENGINE=InnoDB;
