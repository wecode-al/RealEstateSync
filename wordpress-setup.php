<?php
// Add this code to your WordPress theme's functions.php file

// Register Property Custom Post Type
function register_property_post_type() {
    $labels = array(
        'name' => 'Properties',
        'singular_name' => 'Property',
        'menu_name' => 'Properties',
        'add_new' => 'Add New Property',
        'add_new_item' => 'Add New Property',
        'edit_item' => 'Edit Property',
        'new_item' => 'New Property',
        'view_item' => 'View Property',
        'search_items' => 'Search Properties',
        'not_found' => 'No properties found',
        'not_found_in_trash' => 'No properties found in Trash'
    );

    $args = array(
        'labels' => $labels,
        'public' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'property'),
        'capability_type' => 'post',
        'has_archive' => true,
        'hierarchical' => false,
        'menu_position' => 5,
        'supports' => array('title', 'editor', 'thumbnail'),
        'show_in_rest' => true, // Enable Gutenberg editor and REST API
    );

    register_post_type('property', $args);
}
add_action('init', 'register_property_post_type');

// Register Property Meta Fields
function register_property_meta() {
    register_post_meta('property', 'property_price', array(
        'type' => 'number',
        'description' => 'Property price',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_bedrooms', array(
        'type' => 'integer',
        'description' => 'Number of bedrooms',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_bathrooms', array(
        'type' => 'number',
        'description' => 'Number of bathrooms',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_sqft', array(
        'type' => 'number',
        'description' => 'Square footage',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_address', array(
        'type' => 'string',
        'description' => 'Property address',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_city', array(
        'type' => 'string',
        'description' => 'Property city',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_state', array(
        'type' => 'string',
        'description' => 'Property state',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_zip', array(
        'type' => 'string',
        'description' => 'Property ZIP code',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_type', array(
        'type' => 'string',
        'description' => 'Property type',
        'single' => true,
        'show_in_rest' => true,
    ));
    
    register_post_meta('property', 'property_features', array(
        'type' => 'array',
        'description' => 'Property features',
        'single' => true,
        'show_in_rest' => array(
            'schema' => array(
                'type' => 'array',
                'items' => array(
                    'type' => 'string',
                ),
            ),
        ),
    ));
    
    register_post_meta('property', 'property_images', array(
        'type' => 'array',
        'description' => 'Property images',
        'single' => true,
        'show_in_rest' => array(
            'schema' => array(
                'type' => 'array',
                'items' => array(
                    'type' => 'string',
                ),
            ),
        ),
    ));
}
add_action('init', 'register_property_meta');
